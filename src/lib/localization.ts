'use client';

type Language = 'en' | 'ru';

export type Translations = typeof translations;

let currentLang: Language = 'ru'; // Default to Russian, as 'nbrb' is the default source

export function setLang(lang: Language) {
    currentLang = lang;
}

export const getLang = (): Language => {
    return currentLang;
};

const translations = {
    // App Metadata
    'app.title': { ru: 'ВалютаБот', en: 'ValutaBot' },
    'app.description': { ru: 'Телеграм бот для курсов валют', en: 'Telegram bot for currency exchange rates' },

    // Chat Interface
    'chat.title': { ru: 'ВалютаБот', en: 'ValutaBot' },
    'chat.status.online': { ru: 'В сети', en: 'Online' },
    'chat.welcome': { ru: 'Здравствуйте! Я ВалютаБот. Чем могу помочь?', en: 'Hello! I am ValutaBot. How can I assist you today?' },
    'chat.user.showLatestRates': { ru: 'Показать последние курсы', en: 'Show latest rates' },
    'chat.user.convertCurrency': { ru: 'Я хочу конвертировать валюту', en: 'I want to convert currency' },
    'chat.user.setPriceAlert': { ru: 'Установить оповещение о курсе', en: 'Set a price alert' },
    'chat.user.showHistoricalRates': { ru: 'Показать историю курсов', en: 'Show historical rates' },
    'chat.user.trackCurrencyPair': { ru: 'Отслеживать валютную пару', en: 'Track currency pair' },
    'chat.user.changeDataSource': { ru: 'Изменить источник данных', en: 'Change data source' },
    'chat.dataSourceChanged.toast.title': { ru: 'Источник данных изменен', en: 'Data Source Changed' },
    'chat.dataSourceChanged.toast.description': { ru: 'Теперь используется {source}. Чат был сброшен.', en: 'Now using {source}. The chat has been reset.' },
    'chat.dataSourceChanged.message': { ru: 'Источник данных переключен на {source}. Чем могу помочь?', en: 'Data source switched to {source}. How can I help?' },
    'chat.setAlert.error.toast.title': { ru: 'Ошибка установки оповещения', en: 'Error setting alert' },
    'chat.setAlert.error.toast.description': { ru: 'Не удалось найти обменный курс для выбранной пары. Возможно, курсы еще загружаются.', en: 'Could not find an exchange rate for the selected pair. Rates might still be loading.' },
    'chat.setAlert.success.toast.title': { ru: 'Оповещение установлено!', en: 'Alert Set!' },
    'chat.setAlert.success.toast.description': { ru: 'Мы сообщим вам, когда {from}/{to} станет {condition} {threshold}.', en: 'We\'ll notify you when {from}/{to} goes {condition} {threshold}.' },
    'chat.setAlert.success.message': { ru: 'ОК! Оповещение установлено для {from}/{to} {condition} {threshold}.', en: 'OK! Alert set for {from}/{to} {condition} {threshold}.' },
    'chat.trackPair.error.toast.title': { ru: 'Ошибка отслеживания пары', en: 'Error tracking pair' },
    'chat.trackPair.error.toast.description': { ru: 'Не удалось найти обменный курс для выбранной пары. Возможно, курсы еще загружаются.', en: 'Could not find an exchange rate for the selected pair. Rates might still be loading.' },
    'chat.trackPair.success.message': { ru: 'ОК. Теперь я отслеживаю {pair}. Я сообщу вам о любых изменениях.', en: 'OK. I\'m now tracking {pair}. I\'ll notify you of any changes.' },
    'chat.trackPair.remove.message': { ru: 'Я прекратил отслеживание {pair}.', en: 'I\'ve stopped tracking {pair}.' },
    'chat.alert.triggered.toast.title': { ru: 'Сработало оповещение о курсе!', en: 'Price Alert Triggered!' },
    'chat.alert.triggered.toast.description': { ru: '{from}/{to} сейчас {currentRate}, что {condition} вашего порога {threshold}.', en: '{from}/{to} is now {currentRate}, which is {condition} your threshold of {threshold}.' },
    'chat.alert.card.title': { ru: 'Сработало оповещение о курсе!', en: 'Price Alert Triggered!' },
    'chat.alert.card.now': { ru: 'сейчас', en: 'is now' },
    'chat.alert.card.yourAlert': { ru: 'Ваше оповещение было на', en: 'Your alert was for' },
    'chat.alert.card.change': { ru: 'Изменение', en: 'Change' },

    // Action Buttons
    'action.latestRates': { ru: 'Последние курсы', en: 'Latest Rates' },
    'action.convert': { ru: 'Конвертировать', en: 'Convert' },
    'action.setAlert': { ru: 'Установить оповещение', en: 'Set Alert' },
    'action.history': { ru: 'История', en: 'History' },
    'action.track': { ru: 'Отслеживать', en: 'Track' },
    'action.dataSource': { ru: 'Источник данных', en: 'Data Source' },

    // Currency Converter
    'converter.title': { ru: 'Конвертер валют', en: 'Currency Converter' },
    'converter.amount': { ru: 'Сумма', en: 'Amount' },
    'converter.converted': { ru: 'Конвертировано', en: 'Converted' },
    'converter.from': { ru: 'Из', en: 'From' },
    'converter.to': { ru: 'В', en: 'To' },

    // Currency Combobox
    'combobox.placeholder': { ru: 'Выберите валюту...', en: 'Select currency...' },
    'combobox.searchPlaceholder': { ru: 'Поиск валюты...', en: 'Search currency...' },
    'combobox.notFound': { ru: 'Валюта не найдена.', en: 'No currency found.' },

    // Data Source Switcher
    'dataSource.title': { ru: 'Источник данных', en: 'Data Source' },
    'dataSource.description': { ru: 'Выберите источник для курсов валют.', en: 'Select the source for currency exchange rates.' },
    'dataSource.nbrb.title': { ru: 'API НБРБ', en: 'NBRB API' },
    'dataSource.nbrb.description': { ru: 'Официальные дневные курсы Национального банка Беларуси.', en: 'Official daily rates from the National Bank of Belarus.' },
    'dataSource.currencyapi.title': { ru: 'CurrencyAPI.net', en: 'CurrencyAPI.net' },
    'dataSource.currencyapi.description': { ru: 'Частые обновления с мировых валютных рынков.', en: 'Frequent updates from global currency markets.' },
    'dataSource.resetWarning': { ru: 'Переключение источника сбросит сеанс чата.', en: 'Switching the source will reset the chat session.' },

    // Historical Rates
    'historical.title': { ru: 'Исторические данные', en: 'Historical Data' },
    'historical.description': { ru: 'Данные из {source}', en: 'Data from {source}' },
    'historical.tab.dynamics': { ru: 'Динамика', en: 'Dynamics' },
    'historical.tab.single': { ru: 'Одна дата', en: 'Single Date' },
    'historical.tab.range': { ru: 'Диапазон', en: 'Range' },
    'historical.pickDate': { ru: 'Выберите дату', en: 'Pick a date' },
    'historical.pickDateRange': { ru: 'Выберите диапазон дат', en: 'Pick a date range' },
    'historical.showDynamics': { ru: 'Показать динамику', en: 'Show Dynamics' },
    'historical.loading': { ru: 'Загрузка...', en: 'Loading...' },
    'historical.dynamics.description': { ru: 'Динамика курса для {from}/{to}', en: 'Rate dynamics for {from}/{to}' },
    'historical.dynamics.error': { ru: 'Не удалось получить динамику для выбранного периода. Выберите другой диапазон дат.', en: 'Could not fetch dynamics for the selected period. Select another date range.' },
    'historical.rangeTooLarge': { ru: 'Диапазон дат слишком большой', en: 'Date range too large' },
    'historical.rangeTooLarge.description': { ru: 'Пожалуйста, выберите диапазон 30 дней или меньше для CurrencyAPI, чтобы не превышать лимиты API.', en: 'Please select a range of 30 days or less for CurrencyAPI to avoid exceeding API limits.' },
    'historical.getRate': { ru: 'Получить курс', en: 'Get Rate' },
    'historical.rateOn': { ru: 'Курс на', en: 'Rate on' },
    'historical.rateError': { ru: 'Не удалось получить курс для выбранной даты.', en: 'Could not fetch rate for the selected date.' },
    'historical.startDate': { ru: 'Начальная дата', en: 'Start date' },
    'historical.endDate': { ru: 'Конечная дата', en: 'End date' },
    'historical.compareRates': { ru: 'Сравнить курсы', en: 'Compare Rates' },
    'historical.start': { ru: 'Начало', en: 'Start' },
    'historical.end': { ru: 'Конец', en: 'End' },
    'historical.change': { ru: 'Изменение', en: 'Change' },

    // Latest Rates
    'latestRates.title': { ru: 'Последние курсы', en: 'Latest Rates' },
    'latestRates.description': { ru: 'Данные из {source}', en: 'Data from {source}' },
    'latestRates.loading': { ru: 'Загрузка курсов...', en: 'Loading rates...' },

    // Notification Manager
    'notification.title': { ru: 'Установить оповещение о курсе', en: 'Set Price Alert' },
    'notification.from': { ru: 'Из', en: 'From' },
    'notification.to': { ru: 'В', en: 'To' },
    'notification.condition': { ru: 'Условие', en: 'Condition' },
    'notification.condition.above': { ru: 'Выше', en: 'Above' },
    'notification.condition.below': { ru: 'Ниже', en: 'Below' },
    'notification.threshold': { ru: 'Порог', en: 'Threshold' },
    'notification.setAlert': { ru: 'Установить оповещение', en: 'Set Alert' },
    'notification.error.selectCurrency': { ru: 'Пожалуйста, выберите валюту.', en: 'Please select a currency.' },
    'notification.error.positiveThreshold': { ru: 'Порог должен быть положительным числом.', en: 'Threshold must be a positive number.' },
    'notification.error.selectCondition': { ru: 'Пожалуйста, выберите условие.', en: 'Please select a condition.' },
    'notification.error.differentCurrencies': { ru: 'Валюты должны быть разными.', en: 'Currencies must be different.' },

    // Rate Update Card
    'rateUpdate.title': { ru: 'Обновление курса: {pair}', en: 'Rate Update: {pair}' },
    'rateUpdate.newRate': { ru: 'Новый курс', en: 'New rate' },
    'rateUpdate.change': { ru: 'Изменение', en: 'Change' },

    // Tracking Manager
    'tracking.title': { ru: 'Отслеживание валютных пар', en: 'Track Currency Pairs' },
    'tracking.description': { ru: 'Получайте уведомления в чате при изменении курса.', en: 'Get notified in the chat when a rate changes.' },
    'tracking.addPair': { ru: 'Добавить пару', en: 'Add Pair' },
    'tracking.currentlyTracking': { ru: 'Сейчас отслеживается', en: 'Currently Tracking' },
};

export function t(key: keyof typeof translations, params?: Record<string, string | number>): string {
    const lang = getLang();
    const translationSet = translations[key];
    if (!translationSet) {
        console.warn(`Translation set not found for key: ${key}`);
        return key;
    }

    const translation = translationSet[lang];
     if (!translation) {
        console.warn(`Translation not found for key: ${key} and lang: ${lang}`);
        return key;
    }

    if (params) {
        return Object.entries(params).reduce((acc, [paramKey, paramValue]) => {
            const regex = new RegExp(`{${paramKey}}`, 'g');
            return acc.replace(regex, String(paramValue));
        }, translation);
    }
    
    return translation;
}
