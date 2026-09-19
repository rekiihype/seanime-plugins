/// <reference path="../../plugin.d.ts" />
/// <reference path="../../app.d.ts" />
/// <reference path="../../core.d.ts" />

const MAX_HISTORY = 20

function init() {
    // Hook runtime (server-side): runs when a library scan finishes.
    $app.onScanCompleted((e) => {
        // Runtimes can't share variables — hand the value over via $store.
        $store.set("last-scan-ms", e.duration)
        e.next()
    })

    // UI runtime (the plugin's "main thread"): persist + notify.
    $ui.register((ctx) => {
        $store.watch<number>("last-scan-ms", (ms) => {
            const history = $storage.get<Array<{ at: string, ms: number }>>("history") || []
            history.push({ at: new Date().toISOString(), ms })
            while (history.length > MAX_HISTORY) history.shift()
            $storage.set("history", history)

            ctx.toast.info(`Scan finished in ${Math.round(ms / 100) / 10}s`)
        })
    })
}
