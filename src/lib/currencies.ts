
import type { Currency, ExchangeRate, DataSource } from '@/lib/types';
import { format, subDays, differenceInDays, addDays, startOfDay, parseISO } from 'date-fns';
import { getLang } from './localization';


// --- Pub/Sub for State Management ---
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function notify() {
    listeners.forEach(l => l());
}

// --- STATE MANAGEMENT ---
let activeDataSource: DataSource = 'nbrb'; // Default data source

export function setDataSource(source: DataSource) {
    if (source !== activeDataSource) {
        activeDataSource = source;
        // Clear all caches to ensure fresh data from the new source
        nbrbCurrenciesCache = null;
        nbrbFullCurrencyInfoCache = null;
        nbrbRatesCache = {};
        currencyApiCurrenciesCache = null;
        currencyApiRatesCache = {};
        lastCurrencyApiFetchTimestamp = 0;
        notify(); // Notify subscribers of the change
    }
}

export function getDataSource(): DataSource {
    return activeDataSource;
}

// --- SHARED ---
export async function getInitialRates(): Promise<ExchangeRate[]> {
    if (activeDataSource === 'nbrb') {
        await updateNbrbRatesCache();
        return await getNbrbLatestRates();
    } else {
        await updateCurrencyApiRatesCache('USD');
        return await getCurrencyApiLatestRates();
    }
}

// --- API FETCH HELPERS ---
async function nbrbApiFetch(endpoint: string) {
    try {
        const response = await fetch(`https://api.nbrb.by/exrates/${endpoint}`);
        if (!response.ok) {
            console.error(`NBRB request failed: ${response.status} ${response.statusText}`);
            return null;
        }
        return response.json();
    } catch (error) {
        console.error('Failed to fetch from NBRB API:', error);
        return null;
    }
}

async function currencyApiFetch(endpoint: string, params: Record<string, string> = {}) {
    const apiKey = '6431078d4fc8bf5d4097027ee62c2c0dc4e0';

    const url = new URL(`https://currencyapi.net/api/v1/${endpoint}`);
    url.searchParams.append('key', apiKey);
    url.searchParams.append('output', 'json');
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

    try {
        const response = await fetch(url.toString(), {
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) {
            const errorBody = await response.json();
            console.error(`CurrencyAPI request failed: ${response.status} ${response.statusText}`, errorBody);
            return null;
        }
        return response.json();
    } catch (error) {
        console.error('Failed to fetch from CurrencyAPI:', error);
        return null;
    }
}


// --- CURRENCYAPI.NET PROVIDER (v1) ---
let currencyApiCurrenciesCache: { lang: string, data: Currency[] } | null = null;
let currencyApiRatesCache: { [key: string]: number } = {};
let lastCurrencyApiFetchTimestamp = 0;

const PREDEFINED_CURRENCY_NAMES: { [key: string]: string } = {
    "AED": "United Arab Emirates Dirham", "AFN": "Afghan Afghani", "ALL": "Albanian Lek",
    "AMD": "Armenian Dram", "ANG": "Netherlands Antillean Guilder", "AOA": "Angolan Kwanza",
    "ARS": "Argentine Peso", "AUD": "Australian Dollar", "AWG": "Aruban Florin",
    "AZN": "Azerbaijani Manat", "BAM": "Bosnia-Herzegovina Convertible Mark", "BBD": "Barbadian Dollar",
    "BDT": "Bangladeshi Taka", "BGN": "Bulgarian Lev", "BHD": "Bahraini Dinar",
    "BIF": "Burundian Franc", "BMD": "Bermudan Dollar", "BND": "Brunei Dollar",
    "BOB": "Bolivian Boliviano", "BRL": "Brazilian Real", "BSD": "Bahamian Dollar",
    "BTC": "Bitcoin", "BTN": "Bhutanese Ngultrum", "BWP": "Botswanan Pula",
    "BYN": "Belarusian Ruble", "BZD": "Belize Dollar", "CAD": "Canadian Dollar",
    "CDF": "Congolese Franc", "CHF": "Swiss Franc","CLF": "Chilean Unit of Account (UF)",
    "CLP": "Chilean Peso", "CNH": "Chinese Yuan (Offshore)", "CNY": "Chinese Yuan",
    "COP": "Colombian Peso", "CRC": "Costa Rican Colón", "CUC": "Cuban Convertible Peso",
    "CUP": "Cuban Peso", "CVE": "Cape Verdean Escudo", "CZK": "Czech Republic Koruna",
    "DJF": "Djiboutian Franc", "DKK": "Danish Krone", "DOP": "Dominican Peso",
    "DZD": "Algerian Dinar", "EGP": "Egyptian Pound", "ERN": "Eritrean Nakfa",
    "ETB": "Ethiopian Birr", "EUR": "Euro", "FJD": "Fijian Dollar",
    "FKP": "Falkland Islands Pound", "GBP": "British Pound Sterling", "GEL": "Georgian Lari",
    "GGP": "Guernsey Pound", "GHS": "Ghanaian Cedi", "GIP": "Gibraltar Pound",
    "GMD": "Gambian Dalasi", "GNF": "Guinean Franc", "GTQ": "Guatemalan Quetzal",
    "GYD": "Guyanaese Dollar", "HKD": "Hong Kong Dollar", "HNL": "Honduran Lempira",
    "HRK": "Croatian Kuna", "HTG": "Haitian Gourde", "HUF": "Hungarian Forint",
    "IDR": "Indonesian Rupiah", "ILS": "Israeli New Shekel", "IMP": "Manx pound",
    "INR": "Indian Rupee", "IQD": "Iraqi Dinar", "IRR": "Iranian Rial",
    "ISK": "Icelandic Króna", "JEP": "Jersey Pound", "JMD": "Jamaican Dollar",
    "JOD": "Jordanian Dinar", "JPY": "Japanese Yen", "KES": "Kenyan Shilling",
    "KGS": "Kyrgystani Som", "KHR": "Cambodian Riel", "KMF": "Comorian Franc",
    "KPW": "North Korean Won", "KRW": "South Korean Won", "KWD": "Kuwaiti Dinar",
    "KYD": "Cayman Islands Dollar", "KZT": "Kazakhstani Tenge", "LAK": "Laotian Kip",
    "LBP": "Lebanese Pound", "LKR": "Sri Lankan Rupee", "LRD": "Liberian Dollar",
    "LSL": "Lesotho Loti", "LYD": "Libyan Dinar", "MAD": "Moroccan Dirham",
    "MDL": "Moldovan Leu", "MGA": "Malagasy Ariary", "MKD": "Macedonian Denar",
    "MMK": "Myanma Kyat", "MNT": "Mongolian Tugrik", "MOP": "Macanese Pataca",
    "MRO": "Mauritanian Ouguiya (pre-2018)", "MRU": "Mauritanian Ouguiya", "MUR": "Mauritian Rupee",
    "MVR": "Maldivian Rufiyaa", "MWK": "Malawian Kwacha", "MXN": "Mexican Peso",
    "MYR": "Malaysian Ringgit", "MZN": "Mozambican Metical", "NAD": "Namibian Dollar",
    "NGN": "Nigerian Naira", "NIO": "Nicaraguan Córdoba", "NOK": "Norwegian Krone",
    "NPR": "Nepalese Rupee", "NZD": "New Zealand Dollar", "OMR": "Omani Rial",
    "PAB": "Panamanian Balboa", "PEN": "Peruvian Nuevo Sol", "PGK": "Papua New Guinean Kina",
    "PHP": "Philippine Peso", "PKR": "Pakistani Rupee", "PLN": "Polish Zloty",
    "PYG": "Paraguayan Guarani", "QAR": "Qatari Rial", "RON": "Romanian Leu",
    "RSD": "Serbian Dinar", "RUB": "Russian Ruble", "RWF": "Rwandan Franc",
    "SAR": "Saudi Riyal", "SBD": "Solomon Islands Dollar", "SCR": "Seychellois Rupee",
    "SDG": "Sudanese Pound", "SEK": "Swedish Krona", "SGD": "Singapore Dollar",
    "SHP": "Saint Helena Pound", "SLL": "Sierra Leonean Leone", "SOS": "Somali Shilling",
    "SRD": "Surinamese Dollar", "SSP": "South Sudanese Pound", "STD": "São Tomé and Príncipe Dobra (pre-2018)",
    "STN": "São Tomé and Príncipe Dobra", "SVC": "Salvadoran Colón", "SYP": "Syrian Pound",
    "SZL": "Swazi Lilangeni", "THB": "Thai Baht", "TJS": "Tajikistani Somoni",
    "TMT": "Turkmenistani Manat", "TND": "Tunisian Dinar", "TOP": "Tongan Paʻanga",
    "TRY": "Turkish Lira", "TTD": "Trinidad and Tobago Dollar", "TWD": "New Taiwan Dollar",
    "TZS": "Tanzanian Shilling", "UAH": "Ukrainian Hryvnia", "UGX": "Ugandan Shilling",
    "USD": "United States Dollar", "UYU": "Uruguayan Peso", "UZS": "Uzbekistan Som",
    "VEF": "Venezuelan Bolívar Fuerte (Old)", "VES": "Venezuelan Bolívar Soberano",
    "VND": "Vietnamese Dong", "VUV": "Vanuatu Vatu", "WST": "Samoan Tala",
    "XAF": "CFA Franc BEAC", "XAG": "Silver Ounce", "XAU": "Gold Ounce",
    "XCD": "East Caribbean Dollar", "XDR": "Special Drawing Rights", "XOF": "CFA Franc BCEAO",
    "XPD": "Palladium Ounce", "XPF": "CFP Franc", "XPT": "Platinum Ounce",
    "YER": "Yemeni Rial", "ZAR": "South African Rand", "ZMW": "Zambian Kwacha",
    "ZWL": "Zimbabwean Dollar"
};

const PREDEFINED_CURRENCY_NAMES_RU: { [key: string]: string } = {
    "AED": "Дирхам ОАЭ", "AFN": "Афганский афгани", "ALL": "Албанский лек",
    "AMD": "Армянский драм", "ANG": "Нидерландский антильский гульден", "AOA": "Ангольская кванза",
    "ARS": "Аргентинское песо", "AUD": "Австралийский доллар", "AWG": "Арубанский флорин",
    "AZN": "Азербайджанский манат", "BAM": "Конвертируемая марка Боснии и Герцеговины", "BBD": "Барбадосский доллар",
    "BDT": "Бангладешская така", "BGN": "Болгарский лев", "BHD": "Бахрейнский динар",
    "BIF": "Бурундийский франк", "BMD": "Бермудский доллар", "BND": "Брунейский доллар",
    "BOB": "Боливийский боливиано", "BRL": "Бразильский реал", "BSD": "Багамский доллар",
    "BTC": "Биткойн", "BTN": "Бутанский нгултрум", "BWP": "Ботсванская пула",
    "BYN": "Белорусский рубль", "BZD": "Белизский доллар", "CAD": "Канадский доллар",
    "CDF": "Конголезский франк", "CHF": "Швейцарский франк", "CLF": "Чилийская единица счета (UF)",
    "CLP": "Чилийское песо", "CNH": "Китайский юань (офшорный)", "CNY": "Китайский юань",
    "COP": "Колумбийское песо", "CRC": "Коста-риканский колон", "CUC": "Кубинское конвертируемое песо",
    "CUP": "Кубинское песо", "CVE": "Эскудо Кабо-Верде", "CZK": "Чешская крона",
    "DJF": "Джибутийский франк", "DKK": "Датская крона", "DOP": "Доминиканское песо",
    "DZD": "Алжирский динар", "EGP": "Египетский фунт", "ERN": "Эритрейская накфа",
    "ETB": "Эфиопский быр", "EUR": "Евро", "FJD": "Фиджийский доллар",
    "FKP": "Фунт Фолклендских островов", "GBP": "Британский фунт стерлингов", "GEL": "Грузинский лари",
    "GGP": "Гернсийский фунт", "GHS": "Ганский седи", "GIP": "Гибралтарский фунт",
    "GMD": "Гамбийский даласи", "GNF": "Гвинейский франк", "GTQ": "Гватемальский кетсаль",
    "GYD": "Гайанский доллар", "HKD": "Гонконгский доллар", "HNL": "Гондурасская лемпира",
    "HRK": "Хорватская куна", "HTG": "Гаитянский гурд", "HUF": "Венгерский форинт",
    "IDR": "Индонезийская рупия", "ILS": "Израильский новый шекель", "IMP": "Мэнский фунт",
    "INR": "Индийская рупия", "IQD": "Иракский динар", "IRR": "Иранский риал",
    "ISK": "Исландская крона", "JEP": "Джерсийский фунт", "JMD": "Ямайский доллар",
    "JOD": "Иорданский динар", "JPY": "Японская иена", "KES": "Кенийский шиллинг",
    "KGS": "Киргизский сом", "KHR": "Камбоджийский риель", "KMF": "Коморский франк",
    "KPW": "Северокорейская вона", "KRW": "Южнокорейская вона", "KWD": "Кувейтский динар",
    "KYD": "Доллар Каймановых островов", "KZT": "Казахстанский тенге", "LAK": "Лаосский кип",
    "LBP": "Ливанский фунт", "LKR": "Шри-ланкийская рупия", "LRD": "Либерийский доллар",
    "LSL": "Лоти Лесото", "LYD": "Ливийский динар", "MAD": "Марокканский дирхам",
    "MDL": "Молдавский лей", "MGA": "Малагасийский ариари", "MKD": "Македонский денар",
    "MMK": "Мьянманский кьят", "MNT": "Монгольский тугрик", "MOP": "Патака Макао",
    "MRO": "Мавританская угия (до 2018)", "MRU": "Мавританская угия", "MUR": "Маврикийская рупия",
    "MVR": "Мальдивская руфия", "MWK": "Малавийская квача", "MXN": "Мексиканское песо",
    "MYR": "Малайзийский ринггит", "MZN": "Мозамбикский метикал", "NAD": "Намибийский доллар",
    "NGN": "Нигерийская найра", "NIO": "Никарагуанская кордоба", "NOK": "Норвежская крона",
    "NPR": "Непальская рупия", "NZD": "Новозеландский доллар", "OMR": "Оманский риал",
    "PAB": "Панамский бальбоа", "PEN": "Перуанский новый соль", "PGK": "Кина Папуа-Новой Гвинеи",
    "PHP": "Филиппинское песо", "PKR": "Пакистанская рупия", "PLN": "Польский злотый",
    "PYG": "Парагвайский гуарани", "QAR": "Катарский риал", "RON": "Румынский лей",
    "RSD": "Сербский динар", "RUB": "Российский рубль", "RWF": "Руандийский франк",
    "SAR": "Саудовский риял", "SBD": "Доллар Соломоновых островов", "SCR": "Сейшельская рупия",
    "SDG": "Суданский фунт", "SEK": "Шведская крона", "SGD": "Сингапурский доллар",
    "SHP": "Фунт Святой Елены", "SLL": "Сьерра-леонский леоне", "SOS": "Сомалийский шиллинг",
    "SRD": "Суринамский доллар", "SSP": "Южносуданский фунт", "STD": "Добра Сан-Томе и Принсипи (до 2018)",
    "STN": "Добра Сан-Томе и Принсипи", "SVC": "Сальвадорский колон", "SYP": "Сирийский фунт",
    "SZL": "Свазилендский лилангени", "THB": "Таиландский бат", "TJS": "Таджикский сомони",
    "TMT": "Туркменский манат", "TND": "Тунисский динар", "TOP": "Тонганская паанга",
    "TRY": "Турецкая лира", "TTD": "Доллар Тринидада и Тобаго", "TWD": "Новый тайваньский доллар",
    "TZS": "Танзанийский шиллинг", "UAH": "Украинская гривна", "UGX": "Угандийский шиллинг",
    "USD": "Доллар США", "UYU": "Уругвайское песо", "UZS": "Узбекский сум",
    "VEF": "Венесуэльский боливар фуэрте (старый)", "VES": "Венесуэльский боливар соберано",
    "VND": "Вьетнамский донг", "VUV": "Вату Вануату", "WST": "Самоанская тала",
    "XAF": "Франк КФА BEAC", "XAG": "Унция серебра", "XAU": "Унция золота",
    "XCD": "Восточно-карибский доллар", "XDR": "Специальные права заимствования", "XOF": "Франк КФА BCEAO",
    "XPD": "Унция палладия", "XPF": "Франк КФП", "XPT": "Унция платины",
    "YER": "Йеменский риал", "ZAR": "Южноафриканский рэнд", "ZMW": "Замбийская квача",
    "ZWL": "Зимбабвийский доллар"
};


async function getCurrencyApiCurrencies(): Promise<Currency[]> {
    const lang = getLang();
    if (currencyApiCurrenciesCache && currencyApiCurrenciesCache.lang === lang) {
        return currencyApiCurrenciesCache.data;
    }
    
    await updateCurrencyApiRatesCache('USD'); 
    
    const codes = Object.keys(currencyApiRatesCache);
    const nameMap = lang === 'ru' ? PREDEFINED_CURRENCY_NAMES_RU : PREDEFINED_CURRENCY_NAMES;
    
    if (!codes.includes('BYN')) {
        codes.push('BYN');
    }

    const result: Currency[] = codes.map(code => ({
        code,
        name: nameMap[code] || PREDEFINED_CURRENCY_NAMES[code] || `${code} name not found`
    }));
    result.sort((a, b) => a.code.localeCompare(b.code));
    
    currencyApiCurrenciesCache = { lang, data: result };
    return result;
}

async function updateCurrencyApiRatesCache(baseCurrency = 'USD') {
    const data = await currencyApiFetch('rates', { base: baseCurrency });
    if (data && data.rates) {
        const tempCache: { [key: string]: number } = {};
        Object.entries(data.rates).forEach(([code, rate]: [string, any]) => {
            tempCache[code] = parseFloat(rate);
        });
        tempCache[baseCurrency] = 1;
        currencyApiRatesCache = tempCache;
        lastCurrencyApiFetchTimestamp = Date.now();
    }
    
    if (baseCurrency === 'USD' && !currencyApiRatesCache['BYN']) {
        try {
            const nbrbUsdRateData = await nbrbApiFetch('rates/431?periodicity=0'); 
            if (nbrbUsdRateData && nbrbUsdRateData.Cur_OfficialRate) {
                const bynPerUsd = nbrbUsdRateData.Cur_OfficialRate / nbrbUsdRateData.Cur_Scale;
                currencyApiRatesCache['BYN'] = bynPerUsd;
            }
        } catch (e) {
            console.error('Failed to augment cache with NBRB rate for BYN', e);
        }
    }
}

function findCurrencyApiRate(from: string, to: string): number | undefined {
    if (from === to) return 1;

    const fromRate = currencyApiRatesCache[from];
    const toRate = currencyApiRatesCache[to];

    if (fromRate && toRate) {
        return toRate / fromRate;
    }
    return undefined;
}


async function getCurrencyApiLatestRates(): Promise<ExchangeRate[]> {
    if (Date.now() - lastCurrencyApiFetchTimestamp > 5 * 60 * 1000) { // 5 min cache
        await updateCurrencyApiRatesCache('USD');
    }
    const displayedPairs = [
        { from: 'USD', to: 'EUR' }, { from: 'EUR', to: 'USD' }, { from: 'USD', to: 'BYN' },
        { from: 'EUR', to: 'BYN' }, { from: 'USD', to: 'RUB' }, { from: 'EUR', to: 'RUB' },
    ];
    return displayedPairs.map(pair => ({
        ...pair,
        rate: findCurrencyApiRate(pair.from, pair.to) ?? 0,
    })).filter(r => r.rate !== 0);
}

async function getCurrencyApiHistoricalRate(from: string, to: string, date: Date): Promise<number | undefined> {
    console.warn("Historical data is not supported by the provided currencyapi.net API key (v1).");
    return undefined;
}

async function getCurrencyApiDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string, rate: number }[]> {
    console.warn("Historical data is not supported by the provided currencyapi.net API key (v1).");
    return [];
}


// --- NBRB PROVIDER ---
let nbrbCurrenciesCache: Currency[] | null = null;
let nbrbFullCurrencyInfoCache: any[] | null = null;
let nbrbRatesCache: { [key: string]: { rate: number, scale: number } } = {};

async function ensureNbrbFullCache() {
    if (nbrbFullCurrencyInfoCache) return;
    const data = await nbrbApiFetch('currencies');
    if (data) {
        nbrbFullCurrencyInfoCache = data.filter((c: any) => new Date(c.Cur_DateEnd) > new Date());
    } else {
        nbrbFullCurrencyInfoCache = [];
    }
}

function buildNbrbIdMap() {
    if (!nbrbFullCurrencyInfoCache) return {};
    return nbrbFullCurrencyInfoCache.reduce((acc, cur) => {
        acc[cur.Cur_Abbreviation] = cur.Cur_ID;
        return acc;
    }, {} as {[key: string]: number});
}


async function getNbrbCurrencies(): Promise<Currency[]> {
    if (nbrbCurrenciesCache) {
        return nbrbCurrenciesCache;
    }
    
    await ensureNbrbFullCache();
    
    let currencies: Currency[] = [];
    if (nbrbFullCurrencyInfoCache) {
        currencies = nbrbFullCurrencyInfoCache.map((c: any) => ({
            code: c.Cur_Abbreviation,
            name: c.Cur_Name_Eng, // NBRB API also has Cur_Name for Russian
        }));
    }

    if (getLang() === 'ru') {
        currencies.forEach(c => {
            const fullInfo = nbrbFullCurrencyInfoCache?.find(fi => fi.Cur_Abbreviation === c.code);
            if(fullInfo) c.name = fullInfo.Cur_Name;
        });
        if (!currencies.some(c => c.code === 'BYN')) {
            currencies.push({ code: 'BYN', name: 'Белорусский рубль' });
        }
    } else {
         if (!currencies.some(c => c.code === 'BYN')) {
            currencies.push({ code: 'BYN', name: 'Belarusian Ruble' });
        }
    }


    currencies.sort((a, b) => a.code.localeCompare(b.code));
    
    nbrbCurrenciesCache = currencies;
    return nbrbCurrenciesCache;
}

async function updateNbrbRatesCache() {
    const dailyData = await nbrbApiFetch('rates?periodicity=0'); // 0 for daily
    const monthlyData = await nbrbApiFetch('rates?periodicity=1'); // 1 for monthly

    const tempCache: { [key: string]: { rate: number, scale: number } } = {};
    
    if (dailyData) {
        dailyData.forEach((r: any) => {
            tempCache[r.Cur_Abbreviation] = { rate: r.Cur_OfficialRate, scale: r.Cur_Scale };
        });
    }

    if (monthlyData) {
        monthlyData.forEach((r: any) => {
            if (!tempCache[r.Cur_Abbreviation]) { // Don't overwrite daily rate with monthly
                tempCache[r.Cur_Abbreviation] = { rate: r.Cur_OfficialRate, scale: r.Cur_Scale };
            }
        });
    }

    if (Object.keys(tempCache).length > 0) {
        nbrbRatesCache = tempCache;
    }
}

function findNbrbRate(from: string, to: string): number | undefined {
    if (Object.keys(nbrbRatesCache).length === 0) return undefined;
    if (from === to) return 1;

    const toRateInfo = nbrbRatesCache[to];
    const fromRateInfo = nbrbRatesCache[from];
    
    const rateToBynForFROM = from === 'BYN' ? 1 : (fromRateInfo ? fromRateInfo.rate / fromRateInfo.scale : undefined);
    const rateToBynForTO = to === 'BYN' ? 1 : (toRateInfo ? toRateInfo.rate / toRateInfo.scale : undefined);

    if (rateToBynForFROM !== undefined && rateToBynForTO !== undefined) {
        return rateToBynForFROM / rateToBynForTO;
    }
    return undefined;
}

async function getNbrbLatestRates(): Promise<ExchangeRate[]> {
    if (Object.keys(nbrbRatesCache).length === 0) {
        await updateNbrbRatesCache();
    }
    const displayedPairs = [
        { from: 'USD', to: 'EUR' }, { from: 'EUR', to: 'USD' }, { from: 'USD', to: 'BYN' },
        { from: 'EUR', to: 'BYN' }, { from: 'USD', to: 'RUB' }, { from: 'EUR', to: 'RUB' },
    ];
     return displayedPairs.map(pair => ({
        ...pair,
        rate: findNbrbRate(pair.from, pair.to) ?? 0,
    })).filter(r => r.rate !== 0);
}

async function getNbrbHistoricalRate(from: string, to: string, date: Date): Promise<number | undefined> {
    if (from === to) return 1;
    await ensureNbrbFullCache();
    const nbrbIdMap = buildNbrbIdMap();
    
    const formattedDate = format(date, 'yyyy-MM-dd');
    
    const getRateForCode = async (code: string) => {
        if (code === 'BYN') return { rate: 1, scale: 1 };
        const id = nbrbIdMap?.[code];
        if (!id) return undefined;
        const data = await nbrbApiFetch(`rates/${id}?ondate=${formattedDate}`);
        return data ? { rate: data.Cur_OfficialRate, scale: data.Cur_Scale } : undefined;
    };

    const [fromRateInfo, toRateInfo] = await Promise.all([getRateForCode(from), getRateForCode(to)]);
    
    const rateToBynForFROM = fromRateInfo ? fromRateInfo.rate / fromRateInfo.scale : undefined;
    const rateToBynForTO = toRateInfo ? toRateInfo.rate / toRateInfo.scale : undefined;
    
    if (rateToBynForFROM !== undefined && rateToBynForTO !== undefined) {
        return rateToBynForFROM / rateToBynForTO;
    }
    return undefined;
}

async function getNbrbDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string, rate: number }[]> {
    await ensureNbrbFullCache();
    if (!nbrbFullCurrencyInfoCache) return [];

    const nbrbIdMap = buildNbrbIdMap();

    const fromInfo = nbrbFullCurrencyInfoCache.find(c => c.Cur_Abbreviation === from);
    const toInfo = nbrbFullCurrencyInfoCache.find(c => c.Cur_Abbreviation === to);

    const fromScale = from === 'BYN' ? 1 : (fromInfo?.Cur_Scale ?? 1);
    const toScale = to === 'BYN' ? 1 : (toInfo?.Cur_Scale ?? 1);
    
    const formattedStart = format(startDate, 'yyyy-MM-dd');
    const formattedEnd = format(endDate, 'yyyy-MM-dd');

    const getDynamicsForCode = async (code: string) => {
        if (code === 'BYN') {
            const days = differenceInDays(endDate, startDate) + 1;
            return Array.from({ length: days }).map((_, i) => ({ date: addDays(startDate, i), rate: 1 }));
        }
        const id = nbrbIdMap?.[code];
        if (!id) return [];
        const data = await nbrbApiFetch(`rates/dynamics/${id}?startdate=${formattedStart}&enddate=${formattedEnd}`);
        if (!data) return [];
        return data.map((r: any) => ({ date: parseISO(r.Date), rate: r.Cur_OfficialRate }));
    };

    const [fromDynamics, toDynamics] = await Promise.all([getDynamicsForCode(from), getDynamicsForCode(to)]);
    
    if (fromDynamics.length === 0 || toDynamics.length === 0) return [];

    const toMap = new Map(toDynamics.map(d => [format(startOfDay(d.date), 'yyyy-MM-dd'), d.rate]));
    
    const result = fromDynamics.map(fromDay => {
        const toDayRate = toMap.get(format(startOfDay(fromDay.date), 'yyyy-MM-dd'));

        if (toDayRate !== undefined) {
            const rateToBynForFROM = fromDay.rate / fromScale;
            const rateToBynForTO = toDayRate / toScale;
            if (rateToBynForTO === 0) return null;
            return {
                date: format(fromDay.date, 'dd.MM'),
                rate: rateToBynForFROM / rateToBynForTO,
            };
        }
        return null;
    }).filter((d): d is { date: string; rate: number } => d !== null);

    return result;
}


// --- UNIFIED API ---
export async function getCurrencies(): Promise<Currency[]> {
    if (activeDataSource === 'nbrb') {
        return getNbrbCurrencies();
    } else {
        return getCurrencyApiCurrencies();
    }
}

export async function getLatestRates(): Promise<ExchangeRate[]> {
    if (activeDataSource === 'nbrb') {
        return await getNbrbLatestRates();
    } else {
        return await getCurrencyApiLatestRates();
    }
}

export function findRate(from: string, to: string): number | undefined {
    return activeDataSource === 'nbrb' ? findNbrbRate(from, to) : findCurrencyApiRate(from, to);
}

export async function getHistoricalRate(from: string, to: string, date: Date): Promise<number | undefined> {
    return activeDataSource === 'nbrb' ? getNbrbHistoricalRate(from, to, date) : getCurrencyApiHistoricalRate(from, to, date);
}

export async function getDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string; rate: number }[]> {
    return activeDataSource === 'nbrb' ? getNbrbDynamicsForPeriod(from, to, startDate, endDate) : getCurrencyApiDynamicsForPeriod(from, to, startDate, endDate);
}
