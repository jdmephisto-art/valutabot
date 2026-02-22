(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/hooks/use-toast.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "reducer",
    ()=>reducer,
    "toast",
    ()=>toast,
    "useToast",
    ()=>useToast
]);
// Inspired by react-hot-toast library
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;
const actionTypes = {
    ADD_TOAST: "ADD_TOAST",
    UPDATE_TOAST: "UPDATE_TOAST",
    DISMISS_TOAST: "DISMISS_TOAST",
    REMOVE_TOAST: "REMOVE_TOAST"
};
let count = 0;
function genId() {
    count = (count + 1) % Number.MAX_SAFE_INTEGER;
    return count.toString();
}
const toastTimeouts = new Map();
const addToRemoveQueue = (toastId)=>{
    if (toastTimeouts.has(toastId)) {
        return;
    }
    const timeout = setTimeout(()=>{
        toastTimeouts.delete(toastId);
        dispatch({
            type: "REMOVE_TOAST",
            toastId: toastId
        });
    }, TOAST_REMOVE_DELAY);
    toastTimeouts.set(toastId, timeout);
};
const reducer = (state, action)=>{
    switch(action.type){
        case "ADD_TOAST":
            return {
                ...state,
                toasts: [
                    action.toast,
                    ...state.toasts
                ].slice(0, TOAST_LIMIT)
            };
        case "UPDATE_TOAST":
            return {
                ...state,
                toasts: state.toasts.map((t)=>t.id === action.toast.id ? {
                        ...t,
                        ...action.toast
                    } : t)
            };
        case "DISMISS_TOAST":
            {
                const { toastId } = action;
                // ! Side effects ! - This could be extracted into a dismissToast() action,
                // but I'll keep it here for simplicity
                if (toastId) {
                    addToRemoveQueue(toastId);
                } else {
                    state.toasts.forEach((toast)=>{
                        addToRemoveQueue(toast.id);
                    });
                }
                return {
                    ...state,
                    toasts: state.toasts.map((t)=>t.id === toastId || toastId === undefined ? {
                            ...t,
                            open: false
                        } : t)
                };
            }
        case "REMOVE_TOAST":
            if (action.toastId === undefined) {
                return {
                    ...state,
                    toasts: []
                };
            }
            return {
                ...state,
                toasts: state.toasts.filter((t)=>t.id !== action.toastId)
            };
    }
};
const listeners = [];
let memoryState = {
    toasts: []
};
function dispatch(action) {
    memoryState = reducer(memoryState, action);
    listeners.forEach((listener)=>{
        listener(memoryState);
    });
}
function toast(param) {
    let { ...props } = param;
    const id = genId();
    const update = (props)=>dispatch({
            type: "UPDATE_TOAST",
            toast: {
                ...props,
                id
            }
        });
    const dismiss = ()=>dispatch({
            type: "DISMISS_TOAST",
            toastId: id
        });
    dispatch({
        type: "ADD_TOAST",
        toast: {
            ...props,
            id,
            open: true,
            onOpenChange: (open)=>{
                if (!open) dismiss();
            }
        }
    });
    return {
        id: id,
        dismiss,
        update
    };
}
function useToast() {
    _s();
    const [state, setState] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](memoryState);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useToast.useEffect": ()=>{
            listeners.push(setState);
            return ({
                "useToast.useEffect": ()=>{
                    const index = listeners.indexOf(setState);
                    if (index > -1) {
                        listeners.splice(index, 1);
                    }
                }
            })["useToast.useEffect"];
        }
    }["useToast.useEffect"], [
        state
    ]);
    return {
        ...state,
        toast,
        dismiss: (toastId)=>dispatch({
                type: "DISMISS_TOAST",
                toastId
            })
    };
}
_s(useToast, "SPWE98mLGnlsnNfIwu/IAKTSZtk=");
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/utils.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/clsx/dist/clsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-client] (ecmascript)");
;
;
function cn() {
    for(var _len = arguments.length, inputs = new Array(_len), _key = 0; _key < _len; _key++){
        inputs[_key] = arguments[_key];
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/toast.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Toast",
    ()=>Toast,
    "ToastAction",
    ()=>ToastAction,
    "ToastClose",
    ()=>ToastClose,
    "ToastDescription",
    ()=>ToastDescription,
    "ToastProvider",
    ()=>ToastProvider,
    "ToastTitle",
    ()=>ToastTitle,
    "ToastViewport",
    ()=>ToastViewport
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-toast/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/class-variance-authority/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
"use client";
;
;
;
;
;
;
const ToastProvider = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Provider"];
const ToastViewport = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c = (param, ref)=>{
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Viewport"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/toast.tsx",
        lineNumber: 16,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
});
_c1 = ToastViewport;
ToastViewport.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Viewport"].displayName;
const toastVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])("group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full", {
    variants: {
        variant: {
            default: "border bg-background text-foreground",
            destructive: "destructive group border-destructive bg-destructive text-destructive-foreground"
        }
    },
    defaultVariants: {
        variant: "default"
    }
});
const Toast = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c2 = (param, ref)=>{
    let { className, variant, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Root"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(toastVariants({
            variant
        }), className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/toast.tsx",
        lineNumber: 49,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
});
_c3 = Toast;
Toast.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Root"].displayName;
const ToastAction = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c4 = (param, ref)=>{
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Action"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/toast.tsx",
        lineNumber: 62,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
});
_c5 = ToastAction;
ToastAction.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Action"].displayName;
const ToastClose = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c6 = (param, ref)=>{
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Close"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600", className),
        "toast-close": "",
        ...props,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
            className: "h-4 w-4"
        }, void 0, false, {
            fileName: "[project]/src/components/ui/toast.tsx",
            lineNumber: 86,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/src/components/ui/toast.tsx",
        lineNumber: 77,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
});
_c7 = ToastClose;
ToastClose.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Close"].displayName;
const ToastTitle = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c8 = (param, ref)=>{
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Title"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm font-semibold", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/toast.tsx",
        lineNumber: 95,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
});
_c9 = ToastTitle;
ToastTitle.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Title"].displayName;
const ToastDescription = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c10 = (param, ref)=>{
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Description"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm opacity-90", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/toast.tsx",
        lineNumber: 107,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
});
_c11 = ToastDescription;
ToastDescription.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$toast$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Description"].displayName;
;
var _c, _c1, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c10, _c11;
__turbopack_context__.k.register(_c, "ToastViewport$React.forwardRef");
__turbopack_context__.k.register(_c1, "ToastViewport");
__turbopack_context__.k.register(_c2, "Toast$React.forwardRef");
__turbopack_context__.k.register(_c3, "Toast");
__turbopack_context__.k.register(_c4, "ToastAction$React.forwardRef");
__turbopack_context__.k.register(_c5, "ToastAction");
__turbopack_context__.k.register(_c6, "ToastClose$React.forwardRef");
__turbopack_context__.k.register(_c7, "ToastClose");
__turbopack_context__.k.register(_c8, "ToastTitle$React.forwardRef");
__turbopack_context__.k.register(_c9, "ToastTitle");
__turbopack_context__.k.register(_c10, "ToastDescription$React.forwardRef");
__turbopack_context__.k.register(_c11, "ToastDescription");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/toaster.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Toaster",
    ()=>Toaster
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/use-toast.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/toast.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function Toaster() {
    _s();
    const { toasts } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useToast"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToastProvider"], {
        children: [
            toasts.map(function(param) {
                let { id, title, description, action, ...props } = param;
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Toast"], {
                    ...props,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "grid gap-1",
                            children: [
                                title && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToastTitle"], {
                                    children: title
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ui/toaster.tsx",
                                    lineNumber: 22,
                                    columnNumber: 25
                                }, this),
                                description && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToastDescription"], {
                                    children: description
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ui/toaster.tsx",
                                    lineNumber: 24,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/ui/toaster.tsx",
                            lineNumber: 21,
                            columnNumber: 13
                        }, this),
                        action,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToastClose"], {}, void 0, false, {
                            fileName: "[project]/src/components/ui/toaster.tsx",
                            lineNumber: 28,
                            columnNumber: 13
                        }, this)
                    ]
                }, id, true, {
                    fileName: "[project]/src/components/ui/toaster.tsx",
                    lineNumber: 20,
                    columnNumber: 11
                }, this);
            }),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$toast$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ToastViewport"], {}, void 0, false, {
                fileName: "[project]/src/components/ui/toaster.tsx",
                lineNumber: 32,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/toaster.tsx",
        lineNumber: 17,
        columnNumber: 5
    }, this);
}
_s(Toaster, "1YTCnXrq2qRowe0H/LBWLjtXoYc=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$use$2d$toast$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useToast"]
    ];
});
_c = Toaster;
var _c;
__turbopack_context__.k.register(_c, "Toaster");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/translations.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "currencyNames",
    ()=>currencyNames,
    "translations",
    ()=>translations
]);
const currencyNames = {
    en: {
        'AED': 'United Arab Emirates Dirham',
        'AFN': 'Afghan Afghani',
        'ALL': 'Albanian Lek',
        'AMD': 'Armenian Dram',
        'ANG': 'Netherlands Antillean Guilder',
        'AOA': 'Angolan Kwanza',
        'ARS': 'Argentine Peso',
        'AUD': 'Australian Dollar',
        'AWG': 'Aruban Florin',
        'AZN': 'Azerbaijani Manat',
        'BAM': 'Bosnia-Herzegovina Convertible Mark',
        'BBD': 'Barbadian Dollar',
        'BDT': 'Bangladeshi Taka',
        'BGN': 'Bulgarian Lev',
        'BHD': 'Bahraini Dinar',
        'BIF': 'Burundian Franc',
        'BMD': 'Bermudan Dollar',
        'BND': 'Brunei Dollar',
        'BOB': 'Bolivian Boliviano',
        'BRL': 'Brazilian Real',
        'BSD': 'Bahamian Dollar',
        'BTC': 'Bitcoin',
        'BTN': 'Bhutanese Ngultrum',
        'BWP': 'Botswanan Pula',
        'BYN': 'Belarusian Ruble',
        'BZD': 'Belize Dollar',
        'CAD': 'Canadian Dollar',
        'CDF': 'Congolese Franc',
        'CHF': 'Swiss Franc',
        'CLP': 'Chilean Peso',
        'CNY': 'Chinese Yuan',
        'COP': 'Colombian Peso',
        'CRC': 'Costa Rican Colon',
        'CUC': 'Cuban Convertible Peso',
        'CUP': 'Cuban Peso',
        'CVE': 'Cape Verdean Escudo',
        'CZK': 'Czech Koruna',
        'DJF': 'Djiboutian Franc',
        'DKK': 'Danish Krone',
        'DOP': 'Dominican Peso',
        'DZD': 'Algerian Dinar',
        'EGP': 'Egyptian Pound',
        'ERN': 'Eritrean Nakfa',
        'ETB': 'Ethiopian Birr',
        'EUR': 'Euro',
        'FJD': 'Fijian Dollar',
        'FKP': 'Falkland Islands Pound',
        'GBP': 'British Pound',
        'GEL': 'Georgian Lari',
        'GGP': 'Guernsey Pound',
        'GHS': 'Ghanaian Cedi',
        'GIP': 'Gibraltar Pound',
        'GMD': 'Gambian Dalasi',
        'GNF': 'Guinean Franc',
        'GTQ': 'Guatemalan Quetzal',
        'GYD': 'Guyanese Dollar',
        'HKD': 'Hong Kong Dollar',
        'HNL': 'Honduran Lempira',
        'HRK': 'Croatian Kuna',
        'HTG': 'Haitian Gourde',
        'HUF': 'Hungarian Forint',
        'IDR': 'Indonesian Rupiah',
        'ILS': 'Israeli New Shekel',
        'IMP': 'Manx Pound',
        'INR': 'Indian Rupee',
        'IQD': 'Iraqi Dinar',
        'IRR': 'Iranian Rial',
        'ISK': 'Icelandic Krona',
        'JEP': 'Jersey Pound',
        'JMD': 'Jamaican Dollar',
        'JOD': 'Jordanian Dinar',
        'JPY': 'Japanese Yen',
        'KES': 'Kenyan Shilling',
        'KGS': 'Kyrgyzstani Som',
        'KHR': 'Cambodian Riel',
        'KMF': 'Comorian Franc',
        'KPW': 'North Korean Won',
        'KRW': 'South Korean Won',
        'KWD': 'Kuwaiti Dinar',
        'KYD': 'Cayman Islands Dollar',
        'KZT': 'Kazakhstani Tenge',
        'LAK': 'Laotian Kip',
        'LBP': 'Lebanese Pound',
        'LKR': 'Sri Lankan Rupee',
        'LRD': 'Liberian Dollar',
        'LSL': 'Lesotho Loti',
        'LYD': 'Libyan Dinar',
        'MAD': 'Moroccan Dirham',
        'MDL': 'Moldovan Leu',
        'MGA': 'Malagasy Ariary',
        'MKD': 'Macedonian Denar',
        'MMK': 'Myanmar Kyat',
        'MNT': 'Mongolian Tugrik',
        'MOP': 'Macanese Pataca',
        'MRU': 'Mauritanian Ouguiya',
        'MUR': 'Mauritian Rupee',
        'MVR': 'Maldivian Rufiyaa',
        'MWK': 'Malawian Kwacha',
        'MXN': 'Mexican Peso',
        'MYR': 'Malaysian Ringgit',
        'MZN': 'Mozambican Metical',
        'NAD': 'Namibian Dollar',
        'NGN': 'Nigerian Naira',
        'NIO': 'Nicaraguan Cordoba',
        'NOK': 'Norwegian Krone',
        'NPR': 'Nepalese Rupee',
        'NZD': 'New Zealand Dollar',
        'OMR': 'Omani Rial',
        'PAB': 'Panamanian Balboa',
        'PEN': 'Peruvian Sol',
        'PGK': 'Papua New Guinean Kina',
        'PHP': 'Philippine Peso',
        'PKR': 'Pakistani Rupee',
        'PLN': 'Polish Zloty',
        'PYG': 'Paraguayan Guarani',
        'QAR': 'Qatari Rial',
        'RON': 'Romanian Leu',
        'RSD': 'Serbian Dinar',
        'RUB': 'Russian Ruble',
        'RWF': 'Rwandan Franc',
        'SAR': 'Saudi Riyal',
        'SBD': 'Solomon Islands Dollar',
        'SCR': 'Seychellois Rupee',
        'SDG': 'Sudanese Pound',
        'SEK': 'Swedish Krona',
        'SGD': 'Singapore Dollar',
        'SHP': 'Saint Helena Pound',
        'SLL': 'Sierra Leonean Leone',
        'SOS': 'Somali Shilling',
        'SRD': 'Surinamese Dollar',
        'SSP': 'South Sudanese Pound',
        'STN': 'Sao Tome and Principe Dobra',
        'SYP': 'Syrian Pound',
        'SZL': 'Swazi Lilangeni',
        'THB': 'Thai Baht',
        'TJS': 'Tajikistani Somoni',
        'TMT': 'Turkmenistani Manat',
        'TND': 'Tunisian Dinar',
        'TOP': 'Tongan Paʻanga',
        'TRY': 'Turkish Lira',
        'TTD': 'Trinidad and Tobago Dollar',
        'TWD': 'New Taiwan Dollar',
        'TZS': 'Tanzanian Shilling',
        'UAH': 'Ukrainian Hryvnia',
        'UGX': 'Ugandan Shilling',
        'USD': 'US Dollar',
        'UYU': 'Uruguayan Peso',
        'UZS': 'Uzbekistani Som',
        'VES': 'Venezuelan Bolivar',
        'VND': 'Vietnamese Dong',
        'VUV': 'Vanuatu Vatu',
        'WST': 'Samoan Tala',
        'XAF': 'Central African CFA Franc',
        'XCD': 'East Caribbean Dollar',
        'XDR': 'Special Drawing Rights',
        'XOF': 'West African CFA Franc',
        'XPF': 'CFP Franc',
        'YER': 'Yemeni Rial',
        'ZAR': 'South African Rand',
        'ZMW': 'Zambian Kwacha',
        'ZWL': 'Zimbabwean Dollar',
        'XAU': 'Gold (gram)',
        'XAG': 'Silver (gram)',
        'XPT': 'Platinum (gram)',
        'XPD': 'Palladium (gram)',
        'TON': 'Toncoin',
        'SOL': 'Solana',
        'USDT': 'Tether',
        'BNB': 'Binance Coin',
        'XRP': 'Ripple',
        'USDC': 'USD Coin',
        'ADA': 'Cardano',
        'DOGE': 'Dogecoin',
        'TRX': 'TRON',
        'LINK': 'Chainlink',
        'MATIC': 'Polygon',
        'NOT': 'Notcoin',
        'DOGS': 'DOGS',
        'AVAX': 'Avalanche',
        'SHIB': 'Shiba Inu',
        'DOT': 'Polkadot',
        'UNI': 'Uniswap',
        'WBTC': 'Wrapped Bitcoin',
        'LTC': 'Litecoin',
        'NEAR': 'NEAR Protocol',
        'LEO': 'UNUS SED LEO',
        'DAI': 'Dai',
        'BCH': 'Bitcoin Cash',
        'FET': 'Artificial Superintelligence Alliance',
        'RENDER': 'Render Token',
        'PEPE': 'Pepe',
        'ICP': 'Internet Computer',
        'ETC': 'Ethereum Classic',
        'XMR': 'Monero',
        'XLM': 'Stellar',
        'KAS': 'Kaspa',
        'SUI': 'Sui',
        'APT': 'Aptos',
        'HBAR': 'Hedera',
        'STX': 'Stacks',
        'TAO': 'Bittensor',
        'IMX': 'Immutable',
        'FIL': 'Filecoin',
        'ARB': 'Arbitrum',
        'OP': 'Optimism',
        'VET': 'VeChain',
        'MKR': 'Maker',
        'RUNE': 'THORChain',
        'LDO': 'Lido DAO',
        'TIA': 'Celestia',
        'SEI': 'Sei',
        'ALT': 'AltLayer',
        'ANT': 'Aragon',
        'ADX': 'AdEx',
        'ABC': 'Alphacat',
        '611': 'SixEleven',
        'AMM': 'MicroMoney',
        'OG': 'OG Fan Token',
        '1INCH': '1inch Network',
        'AAVE': 'Aave',
        'AGIX': 'SingularityNET',
        'SAND': 'The Sandbox',
        'MANA': 'Decentraland',
        'AXS': 'Axie Infinity',
        'DOG': 'DOG•GO•TO•THE•MOON',
        'FLOKI': 'Floki',
        'BONK': 'Bonk',
        'HNT': 'Helium',
        'THETA': 'Theta Network',
        'ONDO': 'Ondo',
        'OKB': 'OKB',
        'CRO': 'Cronos',
        'ATOM': 'Cosmos Hub',
        'BGB': 'Bitget Token',
        'KCS': 'KuCoin Token',
        'GT': 'GateToken',
        'W': 'Wormhole',
        'STRK': 'Starknet',
        'JUP': 'Jupiter',
        'PYTH': 'Pyth Network',
        'ENA': 'Ethena',
        'WIF': 'dogwifhat',
        'FLR': 'Flare',
        'DYM': 'Dymension',
        'MANTA': 'Manta Network',
        'BEAM': 'Beam',
        'RON': 'Ronin',
        'PIXEL': 'Pixels',
        'ACE': 'Fusionist',
        'XAI': 'XAI',
        'NTRN': 'Neutron',
        'OSMO': 'Osmosis',
        'KUJI': 'Kujira',
        'EVMOS': 'Evmos',
        'SCRT': 'Secret',
        'AKASH': 'Akash Network',
        'AKT': 'Akash Network',
        'DVPN': 'Sentinel'
    },
    ru: {
        'AED': 'Дирхам ОАЭ',
        'AFN': 'Афгани',
        'ALL': 'Албанский лек',
        'AMD': 'Армянский драм',
        'ANG': 'Нидерландский антильский гульден',
        'AOA': 'Ангольская кванза',
        'ARS': 'Аргентинское песо',
        'AUD': 'Австралийский доллар',
        'AWG': 'Арубанский флорин',
        'AZN': 'Азербайджанский манат',
        'BAM': 'Боснийская конвертируемая марка',
        'BBD': 'Барбадосский доллар',
        'BDT': 'Бангладешская taka',
        'BGN': 'Болгарский лев',
        'BHD': 'Бахрейнский динар',
        'BIF': 'Бурундийский франк',
        'BMD': 'Бермудский доллар',
        'BND': 'Брунейский доллар',
        'BOB': 'Боливийский боливиано',
        'BRL': 'Бразильский реал',
        'BSD': 'Багамский доллар',
        'BTN': 'Бутанский нгултрум',
        'BWP': 'Ботсванская пула',
        'BYN': 'Белорусский рубль',
        'BZD': 'Белизский доллар',
        'CAD': 'Канадский доллар',
        'CDF': 'Конголезский франк',
        'CHF': 'Швейцарский франк',
        'CLP': 'Чилийское песо',
        'CNY': 'Китайский юань',
        'COP': 'Колумбийское песо',
        'CRC': 'Коста-риканский колон',
        'CUC': 'Кубинское конвертируемое песо',
        'CUP': 'Кубинское песо',
        'CVE': 'Эскудо Кабо-Верде',
        'CZK': 'Чешская крона',
        'DJF': 'Джибутийский франк',
        'DKK': 'Датская крона',
        'DOP': 'Доминиканское песо',
        'DZD': 'Алжирский динар',
        'EGP': 'Египетский фунт',
        'ERN': 'Эритрейская накфа',
        'ETB': 'Эфиопский быр',
        'EUR': 'Евро',
        'FJD': 'Фиджийский доллар',
        'FKP': 'Фунт Фолклендских островов',
        'GBP': 'Фунт стерлингов',
        'GEL': 'Грузинский лари',
        'GGP': 'Гернсийский фунт',
        'GHS': 'Ганский седи',
        'GIP': 'Гибралтарский фунт',
        'GMD': 'Гамбийский даласи',
        'GNF': 'Гвинейский франк',
        'GTQ': 'Гватемальский кетсаль',
        'GYD': 'Гайанский доллар',
        'HKD': 'Гонконгский доллар',
        'HNL': 'Гондурасская лемпира',
        'HRK': 'Хорватская куна',
        'HTG': 'Гаитянский гурд',
        'HUF': 'Венгерский форинт',
        'IDR': 'Индонезийская рупия',
        'ILS': 'Израильский шекель',
        'IMP': 'Мэнский фунт',
        'INR': 'Индийская рупия',
        'IQD': 'Иракийский динар',
        'IRR': 'Иранский риал',
        'ISK': 'Исландская крона',
        'JEP': 'Джерсийский фунт',
        'JMD': 'Ямайский доллар',
        'JOD': 'Иорданский динар',
        'JPY': 'Японская иена',
        'KES': 'Кенийский шиллинг',
        'KGS': 'Киргизский сом',
        'KHR': 'Камбоджийский риель',
        'KMF': 'Коморский франк',
        'KPW': 'Северокорейская вона',
        'KRW': 'Южнокорейская вона',
        'KWD': 'Кувейтский динар',
        'KYD': 'Доллар Каймановых островов',
        'KZT': 'Казахстанский тенге',
        'LAK': 'Лаосский кип',
        'LBP': 'Ливанский фунт',
        'LKR': 'Шри-ланкийская рупия',
        'LRD': 'Либерийский доллар',
        'LSL': 'Лесотский лоти',
        'LYD': 'Ливийский динар',
        'MAD': 'Марокканский дирхам',
        'MDL': 'Молдавский лей',
        'MGA': 'Малагасийский ариари',
        'MKD': 'Македонский денар',
        'MMK': 'Мьянманский кьят',
        'MNT': 'Монгольский тугрик',
        'MOP': 'Патака Макао',
        'MRU': 'Мавританская угия',
        'MUR': 'Маврикийская рупия',
        'MVR': 'Мальдивская руфия',
        'MWK': 'Малавийская квача',
        'MXN': 'Мексиканское песо',
        'MYR': 'Малайзийский ринггит',
        'MZN': 'Mozambican Metical',
        'NAD': 'Намибийский доллар',
        'NGN': 'Нигерийская найра',
        'NIO': 'Никарагуанская кордоба',
        'NOK': 'Норвежская крона',
        'NPR': 'Непальская рупия',
        'NZD': 'Новозеландский доллар',
        'OMR': 'Оманский риал',
        'PAB': 'Панамское бальбоа',
        'PEN': 'Перуанский соль',
        'PGK': 'Кина Папуа – Новой Гвинеи',
        'PHP': 'Филиппинское песо',
        'PKR': 'Пакистанская рупия',
        'PLN': 'Польский злотый',
        'PYG': 'Парагвайский гуарани',
        'QAR': 'Катарский риал',
        'RON': 'Румынский лей',
        'RSD': 'Сербский динар',
        'RUB': 'Российский рубль',
        'RWF': 'Руандийский франк',
        'SAR': 'Саудовский риял',
        'SBD': 'Доллар Соломоновых островов',
        'SCR': 'Сейшельская рупия',
        'SDG': 'Суданский фунт',
        'SEK': 'Шведская крона',
        'SGD': 'Сингапурский доллар',
        'SHP': 'Фунт Святой Елены',
        'SLL': 'Сьерра-леонский леоне',
        'SOS': 'Somali Shilling',
        'SRD': 'Суринамский доллар',
        'SSP': 'South Sudanese Pound',
        'STN': 'Добра Сан-Томе и Принсипи',
        'SYP': 'Сирийский фунт',
        'SZL': 'Swazi Lilangeni',
        'THB': 'Тайский бат',
        'TJS': 'Таджикский сомони',
        'TMT': 'Туркменский манат',
        'TND': 'Тунисский динар',
        'TOP': 'Тонганская паанга',
        'TRY': 'Турецкая лира',
        'TTD': 'Доллар Тринидада и Тобаго',
        'TWD': 'Новый тайваньский доллар',
        'TZS': 'Танзанийский шиллинг',
        'UAH': 'Украинская гривна',
        'UGX': 'Угандийский шиллинг',
        'USD': 'Доллар США',
        'UYU': 'Уругвайское песо',
        'UZS': 'Узбекский сум',
        'VES': 'Венесуэльский боливар',
        'VND': 'Вьетнамский донг',
        'VUV': 'Вануатский вату',
        'WST': 'Самоанская тала',
        'XAF': 'Франк КФА ВЕАС',
        'XCD': 'Восточно-карибский доллар',
        'XDR': 'СДР (специальные права заимствования)',
        'XOF': 'Франк КФА ВСЕАО',
        'XPF': 'Французский тихоокеанский франк',
        'YER': 'Йеменский риал',
        'ZAR': 'Южноафриканский рэнд',
        'ZMW': 'Замбийская квача',
        'ZWL': 'Зимбабвийский доллар',
        'XAU': 'Золото (грамм)',
        'XAG': 'Серебро (грамм)',
        'XPT': 'Платина (грамм)',
        'XPD': 'Палладий (грамм)',
        'BTC': 'Биткоин',
        'ETH': 'Эфириум',
        'TON': 'Тонкоин',
        'SOL': 'Солана',
        'USDT': 'Тезер',
        'BNB': 'Бинанс Коин',
        'XRP': 'Рипл',
        'USDC': 'ЮСДС Коин',
        'ADA': 'Кардано',
        'DOGE': 'Догикоин',
        'TRX': 'ТРОН',
        'LINK': 'Чейнлинк',
        'MATIC': 'Полигон',
        'NOT': 'Ноткоин',
        'DOGS': 'ДОГС',
        'AVAX': 'Avalanche',
        'SHIB': 'Шиба Ину',
        'DOT': 'Полкадот',
        'UNI': 'Юнисвоп',
        'WBTC': 'Wrapped Bitcoin',
        'LTC': 'Лайткоин',
        'NEAR': 'NEAR Протокол',
        'LEO': 'UNUS SED LEO',
        'DAI': 'Даи',
        'BCH': 'Биткоин Кэш',
        'FET': 'Искусственный интеллект (FET)',
        'RENDER': 'Render Токен',
        'PEPE': 'Pepe',
        'ICP': 'Internet Computer',
        'ETC': 'Ethereum Classic',
        'XMR': 'Monero',
        'XLM': 'Stellar',
        'KAS': 'Kaspa',
        'SUI': 'Sui',
        'APT': 'Aptos',
        'HBAR': 'Hedera',
        'STX': 'Stacks',
        'TAO': 'Bittensor',
        'IMX': 'Immutable',
        'FIL': 'Filecoin',
        'ARB': 'Arbitrum',
        'OP': 'Optimism',
        'VET': 'VeChain',
        'MKR': 'Maker',
        'RUNE': 'THORChain',
        'LDO': 'Lido DAO',
        'TIA': 'Celestia',
        'SEI': 'Sei',
        'ALT': 'AltLayer',
        'ANT': 'Aragon',
        'ADX': 'AdEx',
        'ABC': 'Alphacat',
        '611': 'SixEleven',
        'AMM': 'MicroMoney',
        'OG': 'OG Fan Token',
        '1INCH': '1inch Network',
        'AAVE': 'Aave',
        'AGIX': 'SingularityNET',
        'SAND': 'The Sandbox',
        'MANA': 'Decentraland',
        'AXS': 'Axie Infinity',
        'DOG': 'DOG•GO•TO•THE•MOON',
        'FLOKI': 'Флоки',
        'BONK': 'Бонк',
        'HNT': 'Helium',
        'THETA': 'Theta Network',
        'ONDO': 'Ondo',
        'OKB': 'OKB',
        'CRO': 'Cronos',
        'ATOM': 'Cosmos Hub',
        'BGB': 'Bitget Токен',
        'KCS': 'KuCoin Токен',
        'GT': 'GateToken',
        'W': 'Wormhole',
        'STRK': 'Starknet',
        'JUP': 'Jupiter',
        'PYTH': 'Pyth Network',
        'ENA': 'Ethena',
        'WIF': 'dogwifhat',
        'FLR': 'Flare',
        'DYM': 'Dymension',
        'MANTA': 'Manta Network',
        'BEAM': 'Beam',
        'RON': 'Ronin',
        'PIXEL': 'Pixels',
        'ACE': 'Fusionist',
        'XAI': 'XAI',
        'NTRN': 'Neutron',
        'OSMO': 'Osmosis',
        'KUJI': 'Kujira',
        'EVMOS': 'Evmos',
        'SCRT': 'Secret',
        'AKASH': 'Akash Network',
        'AKT': 'Akash Network',
        'DVPN': 'Sentinel'
    }
};
const translations = {
    en: {
        chat: {
            title: 'CurrencyBot',
            online: 'Online',
            placeholder: 'Hello! I am CurrencyBot. How can I help?',
            showRates: 'Latest rates',
            showConverter: 'Converter',
            setAlert: 'Set alert',
            showHistory: 'History',
            trackPair: 'Track pair',
            switchSource: 'Data source',
            autoClear: 'Auto-clear',
            clear: 'Clear chat',
            showDisplayedPairManager: 'Configure List',
            showOtherAssets: 'Other Assets',
            showPortfolio: 'My Portfolio',
            openInTelegram: 'Open in Telegram',
            installGuide: 'Install App',
            shareAlert: 'Share rate',
            user: {
                rates: 'Show latest rates',
                convert: 'I want to convert currency',
                alert: 'Set a rate alert',
                history: 'Show rates history',
                track: 'Track a currency pair',
                settings: 'Change data source',
                autoClear: 'Set up auto-clear',
                configure_pairs: 'Configure the rates list',
                other_assets: 'Show other assets',
                portfolio: 'Show my portfolio'
            },
            bot: {
                alertSet: 'OK! Alert is set for {from}/{to} {condition} {threshold}.',
                pairTracked: 'OK. Now tracking {pair}. The current rate is {rate}. I will notify you of any changes.',
                pairUntracked: 'I have stopped tracking {pair}.',
                sourceSwitched: 'Data source switched to {source}. How can I help you?',
                pairAddedToList: "OK. The pair {pair} has been added to the list.",
                pairRemovedFromList: "The pair {pair} has been removed from the list.",
                otherAssetsView: "Here are various assets grouped by category. Click on any to see details.",
                portfolioView: "Here is your portfolio. You can manage your assets and see your total capital."
            }
        },
        portfolio: {
            title: 'My Portfolio',
            description: 'Manage your assets and track total balance.',
            addAsset: 'Add Asset',
            totalBalance: 'Total Balance',
            empty: 'Your portfolio is empty. Add your first asset!',
            amount: 'Amount',
            delete: 'Remove',
            displayCurrency: 'View in',
            assetValue: 'Value',
            share: 'Share Portfolio',
            shareText: "📈 My investment portfolio: {balance} {currency}. Track your assets in @CurrencyAll_bot!",
            growth: "Since your last visit: {diff} ({percent}%) {icon}",
            stable: "Balance is stable ⚖️"
        },
        pwa: {
            title: 'Install App',
            description: 'Add CurrencyBot to your home screen for quick access.',
            ios: 'iOS: Tap "Share" and then "Add to Home Screen".',
            android: 'Android: Tap menu (3 dots) and select "Install app".',
            pc: 'PC: Click the install icon in the address bar.'
        },
        otherAssets: {
            title: "Asset Catalog",
            description: "Explore cryptocurrencies and assets by category.",
            popular: "Popular Crypto",
            stablecoins: "Stablecoins",
            telegram: "Telegram Ecosystem",
            infrastructure: "Layer 1 / Layer 2",
            nfts: "NFT Collections (Floor)",
            ai: "AI Tokens",
            defi: "DeFi Protocols",
            metaverse: "Metaverse & GameFi",
            memes: "Meme Coins",
            storage: "Data Storage",
            depin: "DePIN Infrastructure",
            rwa: "Real World Assets (RWA)",
            exchange: "Exchange Tokens",
            action: "Show Rate",
            shareRate: "Share Rate",
            shareText: "📊 Current {from}/{to} rate: {rate}. Track assets in @CurrencyAll_bot!"
        },
        language: {
            toastTitle: 'Language Changed',
            toastDesc: 'Switched to {lang}. The chat has been reset.',
            changeLang: 'Change language'
        },
        latestRates: {
            title: 'Latest Rates',
            titleSingle: 'Asset Rate',
            description: 'Data from {source}',
            loading: 'Loading rates...',
            noPairs: 'No pairs selected for display. Please configure the list from the main menu.',
            configTarget: 'Configure currency',
            targetCurrency: 'Show in',
            tomorrow: 'Tomorrow'
        },
        converter: {
            title: 'Currency Converter',
            from: 'From',
            to: 'To',
            amount: 'Amount',
            converted: 'Converted',
            share: 'Share Result',
            shareText: "💱 {amount} {from} = {result} {to}. Calculated in @CurrencyAll_bot!",
            tomorrowWarning: "⚠️ Tomorrow the rate will change to {rate}. The rate will change by {diff}"
        },
        notifications: {
            title: 'Set Rate Alert',
            from: 'From',
            to: 'To',
            condition: 'Condition',
            above: 'Above',
            below: 'Below',
            threshold: 'Threshold',
            button: 'Set Alert',
            shareText: "📊 Current {from}/{to} rate: {rate}. Track assets in @CurrencyAll_bot!",
            toast: {
                title: 'Alert set!',
                description: 'We will notify you when {from}/{to} goes {condition} {threshold}.',
                errorTitle: 'Error setting alert',
                errorDescription: 'Could not find the exchange rate for the selected pair. Rates might still be loading.'
            }
        },
        history: {
            title: 'Historical Data',
            description: 'Data from {source}',
            tabDynamics: 'Dynamics',
            tabSingle: 'Single Date',
            tabRange: 'Date Range',
            showDynamics: 'Show Dynamics',
            getRate: 'Get Rate',
            compareRates: 'Compare Rates',
            selectDate: 'Pick a date',
            selectRange: 'Pick a date range',
            startDate: 'Start date',
            endDate: 'End date',
            dynamicsFor: 'Rate dynamics for {from}/{to}',
            rateOn: 'Rate on {date}',
            start: 'Start ({date}):',
            end: 'End ({date}):',
            change: 'Change:',
            rangeTooLarge: 'Date range too large',
            rangeTooLargeDesc: 'Please select a range of 30 days or less to avoid exceeding API limits.',
            noDynamics: 'Could not get dynamics for the selected period.',
            dynamicFetchError: 'The API returned an empty response for this pair and period.',
            noRate: 'Could not get the rate for the selected date.',
            fallbackHint: "On {requestedDate} the official rate was not set. Showing last available rate from {actualDate}.",
            futureDate: "Historical data for future dates is not available.",
            share: 'Share Result',
            shareTextSingle: '📊 {from}/{to} rate on {date}: {rate}. Track history in @CurrencyAll_bot!',
            shareTextRange: '📈 {from}/{to} trend: {startRate} ➔ {endRate} ({change}%) from {start} to {end}. @CurrencyAll_bot',
            shareTextDynamics: '📉 {from}/{to} historical dynamics for {start} - {end}. @CurrencyAll_bot'
        },
        tracking: {
            title: 'Track Currency Pairs',
            description: 'Get notified in chat when the rate changes.',
            from: 'From',
            to: 'To',
            addPair: 'Add Pair',
            currentlyTracking: 'Currently tracking',
            updateInterval: 'Update interval (sec)',
            intervalWarning: 'Minimum interval is 10 seconds.',
            setInterval: 'Set Interval',
            intervalSet: 'Interval updated!',
            intervalSetDesc: 'Tracking interval is now {seconds} seconds.',
            alreadyExistsTitle: "Pair Already Tracked",
            alreadyExistsDesc: "The pair {pair} is already being tracked.",
            activeAlerts: "Active Cloud Notifications",
            stop: "Stop",
            alertStopped: "Notification has been stopped.",
            toast: {
                errorTitle: 'Error tracking pair',
                errorDescription: 'Could not find the exchange rate for the selected pair. Rates might still be loading.'
            }
        },
        displayedPairManager: {
            title: "Configure Rates List",
            description: "Choose which pairs to show in 'Latest Rates'.",
            addPair: "Add Pair",
            currentlyDisplayed: "Currently displayed pairs",
            alreadyExistsTitle: "Pair Already Exists",
            alreadyExistsDesc: "The pair {pair} is already in your list."
        },
        dataSource: {
            title: 'Data Source',
            description: 'Choose the source for currency rates.',
            nbrb: 'NBRB API',
            nbrbDesc: 'Official daily rates from the National Bank of Belarus.',
            cbr: 'CBRF API',
            cbrDesc: 'Official daily rates from the Central Bank of Russia.',
            ecb: 'ECB API',
            ecbDesc: 'Official rates from the European Central Bank (Priority for EUR).',
            nbk: 'NBK API',
            nbkDesc: 'Official rates from the National Bank of Kazakhstan (Priority for KZT).',
            worldcurrencyapi: 'WorldCurrencyAPI',
            worldcurrencyapiDesc: 'Frequent updates from global currency markets.',
            warning: 'Switching the source will reset the chat session.',
            toast: 'Data source changed',
            toastDesc: 'Now using {source}. The chat has been reset.'
        },
        rateUpdate: {
            title: 'Rate Update: {pair}',
            newRate: 'New rate:',
            change: '(Change: {change}%)',
            share: 'Share'
        },
        alertCard: {
            title: 'Rate Alert Triggered!',
            currentRate: '{from}/{to} is now {currentRate}',
            yourAlert: 'Your alert was for {condition} {threshold}.',
            change: '(Change: {change}%)'
        },
        autoClear: {
            title: 'Auto-Clear Chat',
            description: 'Set a timer to automatically clear the chat. Set to 0 to disable.',
            minutes: 'Minutes',
            button: 'Set Timer',
            toast: 'Auto-clear timer set!',
            toastDesc: 'Chat will clear in {minutes} minutes.',
            toastDisabled: 'Auto-clear timer disabled.'
        },
        validation: {
            selectCurrency: 'Please select a currency.',
            positiveThreshold: 'Threshold must be a positive number.',
            selectCondition: 'Please select a condition.',
            differentCurrencies: 'Currencies must be different.',
            positiveOrZero: 'Please enter a positive number or 0.'
        },
        combobox: {
            placeholder: 'Select a currency...',
            searchPlaceholder: 'Search currency...',
            notFound: 'Currency not found.',
            fiat: 'Fiat Currencies',
            metals: 'Precious Metals',
            popularCrypto: 'Popular Crypto',
            altcoins: 'Altcoins & Tokens'
        }
    },
    ru: {
        chat: {
            title: 'ВалютаБот',
            online: 'В сети',
            placeholder: 'Здравствуйте! Я ВалютаБот. Чем могу помочь?',
            showRates: 'Последние курсы',
            showConverter: 'Конвертировать',
            setAlert: 'Установить оповещение',
            showHistory: 'История',
            trackPair: 'Отслеживать',
            switchSource: 'Источник данных',
            autoClear: 'Auto-clear',
            clear: 'Очистить чат',
            showDisplayedPairManager: 'Настроить список',
            showOtherAssets: 'Иные активы',
            showPortfolio: 'Мой Портфель',
            openInTelegram: 'Открыть в Telegram',
            installGuide: 'Установить приложение',
            shareAlert: 'Поделиться курсом',
            user: {
                rates: 'Показать последние курсы',
                convert: 'Я хочу конвертировать валюту',
                alert: 'Установить оповещение о курсе',
                history: 'Показать историю курсов',
                track: 'Отслеживать валютную пару',
                settings: 'Изменить источник данных',
                autoClear: 'Настроить автоочистку',
                configure_pairs: 'Настроить список курсов',
                other_assets: 'Показать иные активы',
                portfolio: 'Показать мой портфель'
            },
            bot: {
                alertSet: 'ОК! Оповещение установлено для {from}/{to} {condition} {threshold}.',
                pairTracked: 'ОК. Теперь я отслеживаю {pair}. Текущий курс: {rate}. Я сообщу вам о любых изменениях.',
                pairUntracked: 'Я прекратил отслеживание {pair}.',
                sourceSwitched: 'Источник данных переключен на {source}. Чем могу помочь?',
                pairAddedToList: "ОК. Пара {pair} добавлена в список.",
                pairRemovedFromList: "Пара {pair} удалена из списка.",
                otherAssetsView: "Вот различные активы, разбитые по категориям. Нажмите на любой, чтобы увидеть детали.",
                portfolioView: "Ваш портфель активов. Здесь вы можете управлять своими сбережениями и видеть общий капитал."
            }
        },
        portfolio: {
            title: 'Мой Портфель',
            description: 'Управляйте своими активами и следите за общим балансом.',
            addAsset: 'Добавить актив',
            totalBalance: 'Общий баланс',
            empty: 'Ваш портфель пуст. Добавьте свой первый актив!',
            amount: 'Количество',
            delete: 'Удалить',
            displayCurrency: 'Отображать в',
            assetValue: 'Стоимость',
            share: 'Поделиться портфелем',
            shareText: "📈 Мой инвестиционный портфель: {balance} {currency}. Следи за активами в @CurrencyAll_bot!",
            growth: "С последнего визита: {diff} ({percent}%) {icon}",
            stable: "Баланс стабилен ⚖️"
        },
        pwa: {
            title: 'Установить приложение',
            description: 'Добавьте ВалютаБот на главный экран для быстрого доступа.',
            ios: 'iOS: Нажмите кнопку "Поделиться", затем "На экран "Домой"".',
            android: 'Android: Нажмите на 3 точки и выберите "Установить приложение".',
            pc: 'ПК: Нажмите на иконку установки в адресной строке браузера.'
        },
        otherAssets: {
            title: "Каталог активов",
            description: "Изучите криптовалюты и активы по категориям.",
            popular: "Популярные",
            stablecoins: "Стейблкоины",
            telegram: "Экосистема Telegram",
            infrastructure: "Инфраструктура L1/L2",
            nfts: "NFT Коллекции (Floor)",
            ai: "ИИ-токены",
            defi: "DeFi Протоколы",
            metaverse: "Metaverse & GameFi",
            memes: "Мем-коины",
            storage: "Хранение данных",
            depin: "Децентрализованная инфраструктура",
            rwa: "Реальные активы (RWA)",
            exchange: "Биржевые токены",
            action: "Показать курс",
            shareRate: "Поделиться курсом",
            shareText: "📊 Актуальный курс {from}/{to}: {rate}. Следи за активами в @CurrencyAll_bot!"
        },
        language: {
            toastTitle: 'Язык изменен',
            toastDesc: 'Переключено на {lang}. Чат был сброшен.',
            changeLang: 'Сменить язык'
        },
        latestRates: {
            title: 'Последние курсы',
            titleSingle: 'Курс актива',
            description: 'Данные из {source}',
            loading: 'Загрузка курсов...',
            noPairs: 'Нет выбранных пар для отображения. Пожалуйста, настройте список в главном меню.',
            configTarget: 'Настройка валюты',
            targetCurrency: 'Отображать в',
            tomorrow: 'Завтра'
        },
        converter: {
            title: 'Конвертер валют',
            from: 'Из',
            to: 'В',
            amount: 'Сумма',
            converted: 'Конвертировано',
            share: 'Поделиться результатом',
            shareText: "💱 {amount} {from} = {result} {to}. Посчитано в @CurrencyAll_bot!",
            tomorrowWarning: "⚠️ Завтра курс изменится на {rate}. Курс изменится на {diff}"
        },
        notifications: {
            title: 'Установить оповещение о курсе',
            from: 'Из',
            to: 'В',
            condition: 'Условие',
            above: 'Выше',
            below: 'Ниже',
            threshold: 'Порог',
            button: 'Установить оповещение',
            shareText: "📊 Актуальный курс {from}/{to}: {rate}. Следи за активами в @CurrencyAll_bot!",
            toast: {
                title: 'Оповещение установлено!',
                description: 'Мы сообщим вам, когда {from}/{to} станет {condition} {threshold}.',
                errorTitle: 'Ошибка установки оповещения',
                errorDescription: 'Не удалось найти обменный курс для выбранной пары. Возможно, курсы еще загружаются.'
            }
        },
        history: {
            title: 'Исторические данные',
            description: 'Данные из {source}',
            tabDynamics: 'Динамика',
            tabSingle: 'Одна дата',
            tabRange: 'Диапазон',
            showDynamics: 'Показать динамику',
            getRate: 'Получить курс',
            compareRates: 'Сравнить курсы',
            selectDate: 'Выберите дату',
            selectRange: 'Выберите диапазон дат',
            startDate: 'Начало',
            endDate: 'Конец',
            dynamicsFor: 'Динамика курса для {from}/{to}',
            rateOn: 'Курс на {date}',
            start: 'Начало ({date}):',
            end: 'Конец ({date}):',
            change: 'Изменение:',
            rangeTooLarge: 'Диапазон дат слишком большой',
            rangeTooLargeDesc: 'Пожалуйста, выберите диапазон 30 дней или меньше, чтобы не превышать лимиты API.',
            noDynamics: 'Не удалось получить динамику для выбранного периода.',
            dynamicFetchError: 'API вернуло пустой ответ для этой пары или периода.',
            noRate: 'Не удалось получить курс для выбранной даты.',
            fallbackHint: "На {requestedDate} официальный курс не установлен. Показан последний доступный курс за {actualDate}.",
            futureDate: "Исторические данные для будущих дат недоступны.",
            share: 'Поделиться результатом',
            shareTextSingle: '📊 Курс {from}/{to} на {date}: {rate}. История в @CurrencyAll_bot!',
            shareTextRange: '📈 Тренд {from}/{to}: {startRate} ➔ {endRate} ({change}%) с {start} по {end}. @CurrencyAll_bot',
            shareTextDynamics: '📉 Динамика {from}/{to} за период {start} - {end}. @CurrencyAll_bot'
        },
        tracking: {
            title: 'Отслеживание валютных пар',
            description: 'Получайте уведомления в чате при изменении курса.',
            from: 'Из',
            to: 'В',
            addPair: 'Добавить пару',
            currentlyTracking: 'Сейчас отслеживается',
            updateInterval: 'Интервал обновления (сек)',
            intervalWarning: 'Минимальный интервал - 10 секунд.',
            setInterval: 'Установить интервал',
            intervalSet: 'Интервал обновлен!',
            intervalSetDesc: 'Изменения теперь будут видны быстрее.',
            alreadyExistsTitle: "Пара уже отслеживается",
            alreadyExistsDesc: "Пара {pair} уже отслеживается.",
            activeAlerts: "Активные оповещения в чат",
            stop: "Остановить",
            alertStopped: "Оповещение остановлено.",
            toast: {
                errorTitle: 'Ошибка отслеживания пары',
                errorDescription: 'Не удалось найти обменный курс для выбранной пары. Возможно, курсы еще загружаются.'
            }
        },
        displayedPairManager: {
            title: "Настроить список курсов",
            description: "Выберите, какие пары отображать в 'Последних курсах'.",
            addPair: "Добавить пару",
            currentlyDisplayed: "Отображаемые пары",
            alreadyExistsTitle: "Пара уже существует",
            alreadyExistsDesc: "Пара {pair} уже есть в вашем списке."
        },
        dataSource: {
            title: 'Источник данных',
            description: 'Выберите источник для курсов валют.',
            nbrb: 'API НБРБ',
            nbrbDesc: 'Официальные дневные курсы Национального банка Беларуси.',
            cbr: 'API ЦБ РФ',
            cbrDesc: 'Официальные дневные курсы Центробанка России.',
            ecb: 'API ЕЦБ',
            ecbDesc: 'Официальные курсы Европейского Центрального Банка (Приоритет для EUR).',
            nbk: 'API НБРК',
            nbkDesc: 'Официальные курсы Национального Банка Казахстана (Приоритет для KZT).',
            worldcurrencyapi: 'WorldCurrencyAPI',
            worldcurrencyapiDesc: 'Частые обновления с мировых валютных рынков.',
            warning: 'Переключение источника сбросит сеанс чата.',
            toast: 'Источник данных изменен',
            toastDesc: 'Теперь используется {source}. Чат был сброшен.'
        },
        rateUpdate: {
            title: 'Обновление курса: {pair}',
            newRate: 'Новый курс:',
            change: '(Изменение: {change}%)',
            share: 'Поделиться'
        },
        alertCard: {
            title: 'Сработало оповещение о курсе!',
            currentRate: '{from}/{to} сейчас {currentRate}',
            yourAlert: 'Ваше оповещение было на {condition} {threshold}.',
            change: '(Изменение: {change}%)'
        },
        autoClear: {
            title: 'Автоочистка чата',
            description: 'Установите таймер для автоматической очистки чата. Установите 0, чтобы отключить.',
            minutes: 'Минуты',
            button: 'Установить таймер',
            toast: 'Таймер автоочистки установлен!',
            toastDesc: 'Чат будет очищен через {minutes} минут(ы).',
            toastDisabled: 'Таймер автоочистки отключен.'
        },
        validation: {
            selectCurrency: 'Пожалуйста, выберите валюту.',
            positiveThreshold: 'Порог должен быть положительным числом.',
            selectCondition: 'Пожалуйста, выберите условие.',
            differentCurrencies: 'Валюты должны быть разными.',
            positiveOrZero: 'Введите положительное число или 0.'
        },
        combobox: {
            placeholder: 'Выберите валюту...',
            searchPlaceholder: 'Поиск валюты...',
            notFound: 'Валюта не найдена.',
            fiat: 'Фиатные валюты',
            metals: 'Драгоценные металлы',
            popularCrypto: 'Популярная крипта',
            altcoins: 'Альткоины и токены'
        }
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/localization.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "currencyNames",
    ()=>currencyNames,
    "getCurrencyName",
    ()=>getCurrencyName,
    "getLang",
    ()=>getLang,
    "setLang",
    ()=>setLang,
    "subscribe",
    ()=>subscribe,
    "translations",
    ()=>translations
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$translations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/translations.ts [app-client] (ecmascript)");
;
let lang = 'ru';
const listeners = new Set();
function subscribe(listener) {
    listeners.add(listener);
    listener(lang);
    return ()=>listeners.delete(listener);
}
function notify() {
    listeners.forEach((l)=>l(lang));
}
function setLang(newLang) {
    if (lang !== newLang) {
        lang = newLang;
        notify();
    }
}
function getLang() {
    return lang;
}
function getCurrencyName(code, language) {
    const names = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$translations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["currencyNames"][language];
    var _names_code;
    return (_names_code = names === null || names === void 0 ? void 0 : names[code]) !== null && _names_code !== void 0 ? _names_code : code;
}
const translations = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$translations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["translations"];
const currencyNames = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$translations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["currencyNames"];
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/hooks/use-translation.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useTranslation",
    ()=>useTranslation
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$localization$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/localization.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$locale$2f$en$2d$US$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/locale/en-US.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$locale$2f$ru$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/locale/ru.mjs [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
const CIS_LANGS = [
    'ru',
    'be',
    'uk',
    'hy',
    'ka',
    'az',
    'kk',
    'uz',
    'tg',
    'ky',
    'tk'
];
function useTranslation() {
    _s();
    const [lang, setLangState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$localization$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getLang"])());
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useTranslation.useEffect": ()=>{
            const savedLang = localStorage.getItem('valutabot_lang');
            if (!savedLang) {
                var _Telegram_WebApp_initDataUnsafe_user, _Telegram_WebApp_initDataUnsafe, _Telegram_WebApp, _Telegram, _window_navigator_language;
                const tgLang = (_Telegram = window.Telegram) === null || _Telegram === void 0 ? void 0 : (_Telegram_WebApp = _Telegram.WebApp) === null || _Telegram_WebApp === void 0 ? void 0 : (_Telegram_WebApp_initDataUnsafe = _Telegram_WebApp.initDataUnsafe) === null || _Telegram_WebApp_initDataUnsafe === void 0 ? void 0 : (_Telegram_WebApp_initDataUnsafe_user = _Telegram_WebApp_initDataUnsafe.user) === null || _Telegram_WebApp_initDataUnsafe_user === void 0 ? void 0 : _Telegram_WebApp_initDataUnsafe_user.language_code;
                const browserLang = (_window_navigator_language = window.navigator.language) === null || _window_navigator_language === void 0 ? void 0 : _window_navigator_language.split('-')[0];
                const detected = tgLang || browserLang;
                if (detected && CIS_LANGS.includes(detected)) {
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$localization$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setLang"])('ru');
                } else if (detected === 'en') {
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$localization$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setLang"])('en');
                }
            }
            const unsubscribe = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$localization$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["subscribe"])(setLangState);
            return ({
                "useTranslation.useEffect": ()=>unsubscribe()
            })["useTranslation.useEffect"];
        }
    }["useTranslation.useEffect"], []);
    const setLang = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useTranslation.useCallback[setLang]": (newLang)=>{
            localStorage.setItem('valutabot_lang', newLang);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$localization$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setLang"])(newLang);
        }
    }["useTranslation.useCallback[setLang]"], []);
    const t = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useTranslation.useCallback[t]": (key, params)=>{
            const keys = key.split('.');
            let result = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$localization$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["translations"][lang];
            for (const k of keys){
                result = result === null || result === void 0 ? void 0 : result[k];
                if (result === undefined) return keys[keys.length - 1];
            }
            if (typeof result === 'string' && params) {
                Object.keys(params).forEach({
                    "useTranslation.useCallback[t]": (p)=>{
                        result = result.replace(new RegExp("\\{".concat(p, "\\}"), 'g'), String(params[p]));
                    }
                }["useTranslation.useCallback[t]"]);
            }
            return result !== null && result !== void 0 ? result : key;
        }
    }["useTranslation.useCallback[t]"], [
        lang
    ]);
    const getCurrencyName = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useTranslation.useCallback[getCurrencyName]": (code)=>{
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$localization$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCurrencyName"])(code, lang);
        }
    }["useTranslation.useCallback[getCurrencyName]"], [
        lang
    ]);
    const dateLocale = lang === 'ru' ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$locale$2f$ru$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ru"] : __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$locale$2f$en$2d$US$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["enUS"];
    return {
        t,
        lang,
        setLang,
        getCurrencyName,
        dateLocale
    };
}
_s(useTranslation, "KhBIPRy0m89xYtcK1u1gJmhvXCk=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/language-manager.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LanguageManager",
    ()=>LanguageManager
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$use$2d$translation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/use-translation.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
;
function LanguageManager() {
    _s();
    const { lang, t } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$use$2d$translation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTranslation"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LanguageManager.useEffect": ()=>{
            document.documentElement.lang = lang;
            document.title = t('chat.title');
        }
    }["LanguageManager.useEffect"], [
        lang,
        t
    ]);
    return null; // This component doesn't render anything
}
_s(LanguageManager, "c6JOeaQm2aBzGiSlijuhX19nn0E=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$use$2d$translation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTranslation"]
    ];
});
_c = LanguageManager;
var _c;
__turbopack_context__.k.register(_c, "LanguageManager");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/firebase/config.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "firebaseConfig",
    ()=>firebaseConfig
]);
const firebaseConfig = {
    "projectId": "studio-724575683-23bb2",
    "appId": "1:565103468525:web:0d24f11726324c6001d1e4",
    "apiKey": "AIzaSyCA3wyBx_5_-iJAeLJEjzlcZcu8AqHhiks",
    "authDomain": "studio-724575683-23bb2.firebaseapp.com",
    "measurementId": "",
    "messagingSenderId": "565103468525"
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/firebase/error-emitter.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "errorEmitter",
    ()=>errorEmitter
]);
'use client';
/**
 * A strongly-typed pub/sub event emitter.
 * It uses a generic type T that extends a record of event names to payload types.
 */ function createEventEmitter() {
    // The events object stores arrays of callbacks, keyed by event name.
    // The types ensure that a callback for a specific event matches its payload type.
    const events = {};
    return {
        /**
     * Subscribe to an event.
     * @param eventName The name of the event to subscribe to.
     * @param callback The function to call when the event is emitted.
     */ on (eventName, callback) {
            var _events_eventName;
            if (!events[eventName]) {
                events[eventName] = [];
            }
            (_events_eventName = events[eventName]) === null || _events_eventName === void 0 ? void 0 : _events_eventName.push(callback);
        },
        /**
     * Unsubscribe from an event.
     * @param eventName The name of the event to unsubscribe from.
     * @param callback The specific callback to remove.
     */ off (eventName, callback) {
            var _events_eventName;
            if (!events[eventName]) {
                return;
            }
            events[eventName] = (_events_eventName = events[eventName]) === null || _events_eventName === void 0 ? void 0 : _events_eventName.filter((cb)=>cb !== callback);
        },
        /**
     * Publish an event to all subscribers.
     * @param eventName The name of the event to emit.
     * @param data The data payload that corresponds to the event's type.
     */ emit (eventName, data) {
            var _events_eventName;
            if (!events[eventName]) {
                return;
            }
            (_events_eventName = events[eventName]) === null || _events_eventName === void 0 ? void 0 : _events_eventName.forEach((callback)=>callback(data));
        }
    };
}
const errorEmitter = createEventEmitter();
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/FirebaseErrorListener.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FirebaseErrorListener",
    ()=>FirebaseErrorListener
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$error$2d$emitter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase/error-emitter.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
;
function FirebaseErrorListener() {
    _s();
    // Use the specific error type for the state for type safety.
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "FirebaseErrorListener.useEffect": ()=>{
            // The callback now expects a strongly-typed error, matching the event payload.
            const handleError = {
                "FirebaseErrorListener.useEffect.handleError": (error)=>{
                    // Set error in state to trigger a re-render.
                    setError(error);
                }
            }["FirebaseErrorListener.useEffect.handleError"];
            // The typed emitter will enforce that the callback for 'permission-error'
            // matches the expected payload type (FirestorePermissionError).
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$error$2d$emitter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["errorEmitter"].on('permission-error', handleError);
            // Unsubscribe on unmount to prevent memory leaks.
            return ({
                "FirebaseErrorListener.useEffect": ()=>{
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$error$2d$emitter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["errorEmitter"].off('permission-error', handleError);
                }
            })["FirebaseErrorListener.useEffect"];
        }
    }["FirebaseErrorListener.useEffect"], []);
    // On re-render, if an error exists in state, throw it.
    if (error) {
        throw error;
    }
    // This component renders nothing.
    return null;
}
_s(FirebaseErrorListener, "JfhGochNIqPkY17zyDsXnSE7zLQ=");
_c = FirebaseErrorListener;
var _c;
__turbopack_context__.k.register(_c, "FirebaseErrorListener");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/firebase/provider.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FirebaseContext",
    ()=>FirebaseContext,
    "FirebaseProvider",
    ()=>FirebaseProvider,
    "useAuth",
    ()=>useAuth,
    "useFirebase",
    ()=>useFirebase,
    "useFirebaseApp",
    ()=>useFirebaseApp,
    "useFirestore",
    ()=>useFirestore,
    "useMemoFirebase",
    ()=>useMemoFirebase,
    "useUser",
    ()=>useUser
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/auth/dist/esm/index.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm2017$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/firebase/node_modules/@firebase/auth/dist/esm2017/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$FirebaseErrorListener$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/FirebaseErrorListener.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature(), _s3 = __turbopack_context__.k.signature(), _s4 = __turbopack_context__.k.signature(), _s5 = __turbopack_context__.k.signature(), _s6 = __turbopack_context__.k.signature();
'use client';
;
;
;
const FirebaseContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(undefined);
const FirebaseProvider = (param)=>{
    let { children, firebaseApp, firestore, auth } = param;
    _s();
    const [userAuthState, setUserAuthState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        user: null,
        isUserLoading: true,
        userError: null
    });
    // Effect to subscribe to Firebase auth state changes
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "FirebaseProvider.useEffect": ()=>{
            if (!auth) {
                setUserAuthState({
                    user: null,
                    isUserLoading: false,
                    userError: new Error("Auth service not provided.")
                });
                return;
            }
            setUserAuthState({
                user: null,
                isUserLoading: true,
                userError: null
            }); // Reset on auth instance change
            const unsubscribe = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm2017$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["onAuthStateChanged"])(auth, {
                "FirebaseProvider.useEffect.unsubscribe": (firebaseUser)=>{
                    setUserAuthState({
                        user: firebaseUser,
                        isUserLoading: false,
                        userError: null
                    });
                }
            }["FirebaseProvider.useEffect.unsubscribe"], {
                "FirebaseProvider.useEffect.unsubscribe": (error)=>{
                    console.error("FirebaseProvider: onAuthStateChanged error:", error);
                    setUserAuthState({
                        user: null,
                        isUserLoading: false,
                        userError: error
                    });
                }
            }["FirebaseProvider.useEffect.unsubscribe"]);
            return ({
                "FirebaseProvider.useEffect": ()=>unsubscribe()
            })["FirebaseProvider.useEffect"]; // Cleanup
        }
    }["FirebaseProvider.useEffect"], [
        auth
    ]); // Depends on the auth instance
    // Memoize the context value
    const contextValue = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "FirebaseProvider.useMemo[contextValue]": ()=>{
            const servicesAvailable = !!(firebaseApp && firestore && auth);
            return {
                areServicesAvailable: servicesAvailable,
                firebaseApp: servicesAvailable ? firebaseApp : null,
                firestore: servicesAvailable ? firestore : null,
                auth: servicesAvailable ? auth : null,
                user: userAuthState.user,
                isUserLoading: userAuthState.isUserLoading,
                userError: userAuthState.userError
            };
        }
    }["FirebaseProvider.useMemo[contextValue]"], [
        firebaseApp,
        firestore,
        auth,
        userAuthState
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(FirebaseContext.Provider, {
        value: contextValue,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$FirebaseErrorListener$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FirebaseErrorListener"], {}, void 0, false, {
                fileName: "[project]/src/firebase/provider.tsx",
                lineNumber: 108,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            children
        ]
    }, void 0, true, {
        fileName: "[project]/src/firebase/provider.tsx",
        lineNumber: 107,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(FirebaseProvider, "OHe6bVjVSw9ThvW0Yh4MUWnvKSA=");
_c = FirebaseProvider;
const useFirebase = ()=>{
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(FirebaseContext);
    if (context === undefined) {
        throw new Error('useFirebase must be used within a FirebaseProvider.');
    }
    if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
        throw new Error('Firebase core services not available. Check FirebaseProvider props.');
    }
    return {
        firebaseApp: context.firebaseApp,
        firestore: context.firestore,
        auth: context.auth,
        user: context.user,
        isUserLoading: context.isUserLoading,
        userError: context.userError
    };
};
_s1(useFirebase, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
const useAuth = ()=>{
    _s2();
    const { auth } = useFirebase();
    return auth;
};
_s2(useAuth, "OT++aEmwDNADnnUbJWMr+/+OlXk=", false, function() {
    return [
        useFirebase
    ];
});
const useFirestore = ()=>{
    _s3();
    const { firestore } = useFirebase();
    return firestore;
};
_s3(useFirestore, "qhfb8rRcOGdBgKRv/FCwwKsZ/wI=", false, function() {
    return [
        useFirebase
    ];
});
const useFirebaseApp = ()=>{
    _s4();
    const { firebaseApp } = useFirebase();
    return firebaseApp;
};
_s4(useFirebaseApp, "D6Olf0BZyJfxRd0p3osYAvkHH+4=", false, function() {
    return [
        useFirebase
    ];
});
function useMemoFirebase(factory, deps) {
    _s5();
    const memoized = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])(factory, deps);
    if (typeof memoized !== 'object' || memoized === null) return memoized;
    memoized.__memo = true;
    return memoized;
}
_s5(useMemoFirebase, "KMI6DIONdD7isGYT+tL7kc0anjg=");
const useUser = ()=>{
    _s6();
    const { user, isUserLoading, userError } = useFirebase(); // Leverages the main hook
    return {
        user,
        isUserLoading,
        userError
    };
};
_s6(useUser, "huZTQEv0vojfA8ahUwgbOjgU01Y=", false, function() {
    return [
        useFirebase
    ];
});
var _c;
__turbopack_context__.k.register(_c, "FirebaseProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/firebase/client-provider.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FirebaseClientProvider",
    ()=>FirebaseClientProvider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase/provider.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/firebase/index.ts [app-client] (ecmascript) <locals>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
function FirebaseClientProvider(param) {
    let { children } = param;
    _s();
    const firebaseServices = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "FirebaseClientProvider.useMemo[firebaseServices]": ()=>{
            // Initialize Firebase on the client side, once per component mount.
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["initializeFirebase"])();
        }
    }["FirebaseClientProvider.useMemo[firebaseServices]"], []); // Empty dependency array ensures this runs only once on mount
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FirebaseProvider"], {
        firebaseApp: firebaseServices.firebaseApp,
        auth: firebaseServices.auth,
        firestore: firebaseServices.firestore,
        children: children
    }, void 0, false, {
        fileName: "[project]/src/firebase/client-provider.tsx",
        lineNumber: 18,
        columnNumber: 5
    }, this);
}
_s(FirebaseClientProvider, "Lj8mzKKpcLm+9EDLTAsFUDXE+NQ=");
_c = FirebaseClientProvider;
var _c;
__turbopack_context__.k.register(_c, "FirebaseClientProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/firebase/errors.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FirestorePermissionError",
    ()=>FirestorePermissionError
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@swc/helpers/esm/_define_property.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/auth/dist/esm/index.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm2017$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/firebase/node_modules/@firebase/auth/dist/esm2017/index.js [app-client] (ecmascript)");
'use client';
;
;
/**
 * Builds a security-rule-compliant auth object from the Firebase User.
 * @param currentUser The currently authenticated Firebase user.
 * @returns An object that mirrors request.auth in security rules, or null.
 */ function buildAuthObject(currentUser) {
    var _currentUser_providerData_;
    if (!currentUser) {
        return null;
    }
    const token = {
        name: currentUser.displayName,
        email: currentUser.email,
        email_verified: currentUser.emailVerified,
        phone_number: currentUser.phoneNumber,
        sub: currentUser.uid,
        firebase: {
            identities: currentUser.providerData.reduce((acc, p)=>{
                if (p.providerId) {
                    acc[p.providerId] = [
                        p.uid
                    ];
                }
                return acc;
            }, {}),
            sign_in_provider: ((_currentUser_providerData_ = currentUser.providerData[0]) === null || _currentUser_providerData_ === void 0 ? void 0 : _currentUser_providerData_.providerId) || 'custom',
            tenant: currentUser.tenantId
        }
    };
    return {
        uid: currentUser.uid,
        token: token
    };
}
/**
 * Builds the complete, simulated request object for the error message.
 * It safely tries to get the current authenticated user.
 * @param context The context of the failed Firestore operation.
 * @returns A structured request object.
 */ function buildRequestObject(context) {
    let authObject = null;
    try {
        // Safely attempt to get the current user.
        const firebaseAuth = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm2017$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getAuth"])();
        const currentUser = firebaseAuth.currentUser;
        if (currentUser) {
            authObject = buildAuthObject(currentUser);
        }
    } catch (e) {
    // This will catch errors if the Firebase app is not yet initialized.
    // In this case, we'll proceed without auth information.
    }
    return {
        auth: authObject,
        method: context.operation,
        path: "/databases/(default)/documents/".concat(context.path),
        resource: context.requestResourceData ? {
            data: context.requestResourceData
        } : undefined
    };
}
/**
 * Builds the final, formatted error message for the LLM.
 * @param requestObject The simulated request object.
 * @returns A string containing the error message and the JSON payload.
 */ function buildErrorMessage(requestObject) {
    return "Missing or insufficient permissions: The following request was denied by Firestore Security Rules:\n".concat(JSON.stringify(requestObject, null, 2));
}
class FirestorePermissionError extends Error {
    constructor(context){
        const requestObject = buildRequestObject(context);
        super(buildErrorMessage(requestObject)), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "request", void 0);
        this.name = 'FirebaseError';
        this.request = requestObject;
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/firebase/firestore/use-collection.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useCollection",
    ()=>useCollection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$firestore$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/firestore/dist/esm/index.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/firestore/dist/index.esm2017.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$error$2d$emitter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase/error-emitter.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase/errors.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function useCollection(memoizedTargetRefOrQuery) {
    _s();
    const [data, setData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useCollection.useEffect": ()=>{
            if (!memoizedTargetRefOrQuery) {
                setData(null);
                setIsLoading(false);
                setError(null);
                return;
            }
            setIsLoading(true);
            setError(null);
            // Directly use memoizedTargetRefOrQuery as it's assumed to be the final query
            const unsubscribe = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["onSnapshot"])(memoizedTargetRefOrQuery, {
                "useCollection.useEffect.unsubscribe": (snapshot)=>{
                    const results = [];
                    for (const doc of snapshot.docs){
                        results.push({
                            ...doc.data(),
                            id: doc.id
                        });
                    }
                    setData(results);
                    setError(null);
                    setIsLoading(false);
                }
            }["useCollection.useEffect.unsubscribe"], {
                "useCollection.useEffect.unsubscribe": (error)=>{
                    // This logic extracts the path from either a ref or a query
                    const path = memoizedTargetRefOrQuery.type === 'collection' ? memoizedTargetRefOrQuery.path : memoizedTargetRefOrQuery._query.path.canonicalString();
                    const contextualError = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FirestorePermissionError"]({
                        operation: 'list',
                        path
                    });
                    setError(contextualError);
                    setData(null);
                    setIsLoading(false);
                    // trigger global error propagation
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$error$2d$emitter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["errorEmitter"].emit('permission-error', contextualError);
                }
            }["useCollection.useEffect.unsubscribe"]);
            return ({
                "useCollection.useEffect": ()=>unsubscribe()
            })["useCollection.useEffect"];
        }
    }["useCollection.useEffect"], [
        memoizedTargetRefOrQuery
    ]); // Re-run if the target query/reference changes.
    if (memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
        throw new Error(memoizedTargetRefOrQuery + ' was not properly memoized using useMemoFirebase');
    }
    return {
        data,
        isLoading,
        error
    };
}
_s(useCollection, "Qxb2xEOOegLE3UwVAsDMiTNANhw=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/firebase/firestore/use-doc.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useDoc",
    ()=>useDoc
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$firestore$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/firestore/dist/esm/index.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/firestore/dist/index.esm2017.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$error$2d$emitter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase/error-emitter.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase/errors.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function useDoc(memoizedDocRef) {
    _s();
    const [data, setData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useDoc.useEffect": ()=>{
            if (!memoizedDocRef) {
                setData(null);
                setIsLoading(false);
                setError(null);
                return;
            }
            setIsLoading(true);
            setError(null);
            // Optional: setData(null); // Clear previous data instantly
            const unsubscribe = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["onSnapshot"])(memoizedDocRef, {
                "useDoc.useEffect.unsubscribe": (snapshot)=>{
                    if (snapshot.exists()) {
                        setData({
                            ...snapshot.data(),
                            id: snapshot.id
                        });
                    } else {
                        // Document does not exist
                        setData(null);
                    }
                    setError(null); // Clear any previous error on successful snapshot (even if doc doesn't exist)
                    setIsLoading(false);
                }
            }["useDoc.useEffect.unsubscribe"], {
                "useDoc.useEffect.unsubscribe": (error)=>{
                    const contextualError = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FirestorePermissionError"]({
                        operation: 'get',
                        path: memoizedDocRef.path
                    });
                    setError(contextualError);
                    setData(null);
                    setIsLoading(false);
                    // trigger global error propagation
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$error$2d$emitter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["errorEmitter"].emit('permission-error', contextualError);
                }
            }["useDoc.useEffect.unsubscribe"]);
            return ({
                "useDoc.useEffect": ()=>unsubscribe()
            })["useDoc.useEffect"];
        }
    }["useDoc.useEffect"], [
        memoizedDocRef
    ]); // Re-run if the memoizedDocRef changes.
    return {
        data,
        isLoading,
        error
    };
}
_s(useDoc, "Qxb2xEOOegLE3UwVAsDMiTNANhw=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/firebase/non-blocking-updates.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "addDocumentNonBlocking",
    ()=>addDocumentNonBlocking,
    "deleteDocumentNonBlocking",
    ()=>deleteDocumentNonBlocking,
    "setDocumentNonBlocking",
    ()=>setDocumentNonBlocking,
    "updateDocumentNonBlocking",
    ()=>updateDocumentNonBlocking
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$firestore$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/firestore/dist/esm/index.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/firestore/dist/index.esm2017.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$error$2d$emitter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase/error-emitter.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase/errors.ts [app-client] (ecmascript)");
'use client';
;
;
;
function setDocumentNonBlocking(docRef, data, options) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setDoc"])(docRef, data, options).catch((error)=>{
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$error$2d$emitter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["errorEmitter"].emit('permission-error', new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FirestorePermissionError"]({
            path: docRef.path,
            operation: 'write',
            requestResourceData: data
        }));
    });
// Execution continues immediately
}
function addDocumentNonBlocking(colRef, data) {
    const promise = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addDoc"])(colRef, data).catch((error)=>{
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$error$2d$emitter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["errorEmitter"].emit('permission-error', new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FirestorePermissionError"]({
            path: colRef.path,
            operation: 'create',
            requestResourceData: data
        }));
    });
    return promise;
}
function updateDocumentNonBlocking(docRef, data) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateDoc"])(docRef, data).catch((error)=>{
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$error$2d$emitter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["errorEmitter"].emit('permission-error', new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FirestorePermissionError"]({
            path: docRef.path,
            operation: 'update',
            requestResourceData: data
        }));
    });
}
function deleteDocumentNonBlocking(docRef) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deleteDoc"])(docRef).catch((error)=>{
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$error$2d$emitter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["errorEmitter"].emit('permission-error', new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FirestorePermissionError"]({
            path: docRef.path,
            operation: 'delete'
        }));
    });
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/firebase/non-blocking-login.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "initiateAnonymousSignIn",
    ()=>initiateAnonymousSignIn,
    "initiateEmailSignIn",
    ()=>initiateEmailSignIn,
    "initiateEmailSignUp",
    ()=>initiateEmailSignUp
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/auth/dist/esm/index.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm2017$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/firebase/node_modules/@firebase/auth/dist/esm2017/index.js [app-client] (ecmascript)");
'use client';
;
function initiateAnonymousSignIn(authInstance) {
    // CRITICAL: Call signInAnonymously directly. Do NOT use 'await signInAnonymously(...)'.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm2017$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["signInAnonymously"])(authInstance);
// Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}
function initiateEmailSignUp(authInstance, email, password) {
    // CRITICAL: Call createUserWithEmailAndPassword directly. Do NOT use 'await createUserWithEmailAndPassword(...)'.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm2017$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createUserWithEmailAndPassword"])(authInstance, email, password);
// Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}
function initiateEmailSignIn(authInstance, email, password) {
    // CRITICAL: Call signInWithEmailAndPassword directly. Do NOT use 'await signInWithEmailAndPassword(...)'.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm2017$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["signInWithEmailAndPassword"])(authInstance, email, password);
// Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/firebase/index.ts [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getSdks",
    ()=>getSdks,
    "initializeFirebase",
    ()=>initializeFirebase
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase/config.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/app/dist/esm/index.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/app/dist/esm/index.esm2017.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/auth/dist/esm/index.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm2017$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/firebase/node_modules/@firebase/auth/dist/esm2017/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$firestore$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/firestore/dist/esm/index.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/firestore/dist/index.esm2017.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase/provider.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$client$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase/client-provider.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$firestore$2f$use$2d$collection$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase/firestore/use-collection.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$firestore$2f$use$2d$doc$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase/firestore/use-doc.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$non$2d$blocking$2d$updates$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase/non-blocking-updates.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$non$2d$blocking$2d$login$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase/non-blocking-login.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase/errors.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$error$2d$emitter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase/error-emitter.ts [app-client] (ecmascript)");
'use client';
;
;
;
;
function initializeFirebase() {
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getApps"])().length) {
        let firebaseApp;
        try {
            // Attempt to initialize via Firebase App Hosting environment variables
            // If this throws, it's normal when not on Firebase Hosting
            firebaseApp = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["initializeApp"])();
        } catch (e) {
            // Fallback to config object without loud warning
            firebaseApp = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["initializeApp"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["firebaseConfig"]);
        }
        return getSdks(firebaseApp);
    }
    // If already initialized, return the SDKs with the already initialized App
    return getSdks((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getApp"])());
}
function getSdks(firebaseApp) {
    return {
        firebaseApp,
        auth: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm2017$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getAuth"])(firebaseApp),
        firestore: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$firestore$2f$dist$2f$index$2e$esm2017$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getFirestore"])(firebaseApp)
    };
}
;
;
;
;
;
;
;
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/firebase/index.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FirebaseClientProvider",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$client$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FirebaseClientProvider"],
    "FirebaseContext",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FirebaseContext"],
    "FirebaseProvider",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FirebaseProvider"],
    "FirestorePermissionError",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FirestorePermissionError"],
    "addDocumentNonBlocking",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$non$2d$blocking$2d$updates$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addDocumentNonBlocking"],
    "deleteDocumentNonBlocking",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$non$2d$blocking$2d$updates$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deleteDocumentNonBlocking"],
    "errorEmitter",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$error$2d$emitter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["errorEmitter"],
    "getSdks",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["getSdks"],
    "initializeFirebase",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["initializeFirebase"],
    "initiateAnonymousSignIn",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$non$2d$blocking$2d$login$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["initiateAnonymousSignIn"],
    "initiateEmailSignIn",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$non$2d$blocking$2d$login$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["initiateEmailSignIn"],
    "initiateEmailSignUp",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$non$2d$blocking$2d$login$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["initiateEmailSignUp"],
    "setDocumentNonBlocking",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$non$2d$blocking$2d$updates$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setDocumentNonBlocking"],
    "updateDocumentNonBlocking",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$non$2d$blocking$2d$updates$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateDocumentNonBlocking"],
    "useAuth",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"],
    "useCollection",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$firestore$2f$use$2d$collection$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCollection"],
    "useDoc",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$firestore$2f$use$2d$doc$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useDoc"],
    "useFirebase",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useFirebase"],
    "useFirebaseApp",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useFirebaseApp"],
    "useFirestore",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useFirestore"],
    "useMemoFirebase",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemoFirebase"],
    "useUser",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useUser"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/firebase/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase/provider.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$client$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase/client-provider.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$firestore$2f$use$2d$collection$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase/firestore/use-collection.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$firestore$2f$use$2d$doc$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase/firestore/use-doc.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$non$2d$blocking$2d$updates$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase/non-blocking-updates.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$non$2d$blocking$2d$login$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase/non-blocking-login.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase/errors.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2f$error$2d$emitter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase/error-emitter.ts [app-client] (ecmascript)");
}),
]);

//# sourceMappingURL=src_8a90e6ef._.js.map