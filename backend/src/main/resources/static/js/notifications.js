// =============================================================================
// NOTIFICATIONS (Web Push / PWA)
// Handles Service Worker registration, push subscription, and Settings UI.
// Requires: VAPID keys on backend, HTTPS, and browser Notification permission.
// iOS: only works when app is installed via Safari → Share → "На экран «Домой»".
// =============================================================================

/**
 * Converts a base64url VAPID public key string to a Uint8Array
 * required by pushManager.subscribe().
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);

    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

/**
 * Registers /sw.js and returns the ServiceWorkerRegistration.
 * Returns null if Service Workers or Push API are not supported.
 */
async function getSwRegistration() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;

    try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        return reg;
    } catch (e) {
        console.error('[Notif] SW registration failed:', e);
        return null;
    }
}

/**
 * Returns the current PushSubscription if active, null otherwise.
 */
async function getCurrentPushSubscription() {
    const reg = await navigator.serviceWorker?.getRegistration('/sw.js');

    return reg ? reg.pushManager.getSubscription() : null;
}

/**
 * Subscribes the user to push notifications:
 *  1. Register SW
 *  2. Request notification permission
 *  3. Fetch VAPID public key
 *  4. Subscribe via pushManager
 *  5. POST subscription to backend
 */
async function subscribeToPush(intervalHours) {
    const reg = await getSwRegistration();

    if (!reg) {
        toast(t('toastPushNotSupported'));
        setNotifToggleState(false);
        return;
    }

    if (Notification.permission === 'default') {
        toast(t('toastPushAskPermission'));
        await new Promise(r => setTimeout(r, 800)); // small pause, to show toast
    }

    const perm = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();

    if (perm !== 'granted') {
        toast(t('toastPushDenied'));
        setNotifToggleState(false);
        return;
    }

    try {
        // Fetch VAPID public key from backend
        const keyRes = await fetch('/api/push/vapid-public-key');
        const {publicKey} = await keyRes.json();

        if (!publicKey) {
            toast(t('toastPushUnavailable'));
            setNotifToggleState(false);
            return;
        }

        // Subscribe in the browser
        const subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
        });

        const subJson = subscription.toJSON();

        // Save subscription to backend
        await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                endpoint: subJson.endpoint,
                keys: {
                    p256dh: subJson.keys.p256dh,
                    auth: subJson.keys.auth
                },
                intervalHours
            })
        });

        updateNotifUI(true, intervalHours);
        toast(t('toastPushEnabled'));
    } catch (e) {
        console.error('[Notif] Subscribe failed:', e);
        toast(t('toastPushSubscribeError'));
        setNotifToggleState(false);
    }
}

/**
 * Unsubscribes from push: removes from browser + notifies backend.
 */
async function unsubscribeFromPush() {
    try {
        const sub = await getCurrentPushSubscription();

        if (sub) {
            const endpoint = sub.endpoint;
            await sub.unsubscribe();
            await fetch('/api/push/unsubscribe', {
                method: 'DELETE',
                headers: authHeaders(),
                body: JSON.stringify({endpoint})
            });
        }

        updateNotifUI(false);
        toast(t('toastPushDisabled'));
    } catch (e) {
        console.error('[Notif] Unsubscribe failed:', e);
        toast(t('toastPushUnsubscribeError'));
    }
}

/**
 * Called by the Settings toggle. Subscribes or unsubscribes.
 * @param {boolean} enabled
 */
async function handleNotifToggle(enabled) {
    setNotifToggleState(enabled);

    if (isGuest) {
        toast(t('toastPushLoginRequired'));
        setNotifToggleState(false);
        return;
    }

    const intervalHours = parseInt(
        document.querySelector('#notif-interval-toggle .import-source-tab.is-active')?.dataset.intervalValue || '24', 10
    );

    if (enabled) {
        await subscribeToPush(intervalHours);
    } else {
        await unsubscribeFromPush();
    }
}

/**
 * Handles selection from the notification interval segmented toggle.
 * @param {HTMLElement} el - The clicked tab.
 */
function selectNotifInterval(el) {
    document.querySelectorAll('#notif-interval-toggle .import-source-tab').forEach(tab => {
        tab.classList.toggle('is-active', tab === el);
    });
    moveToggleIndicator(document.getElementById('notif-interval-toggle'));

    handleNotifIntervalChange(el.dataset.intervalValue);
}

function handleNotifIntervalChange(value) {
    fetch('/api/push/interval', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({intervalHours: parseInt(value, 10)})
    }).catch(e => console.error('[Notif] Interval update failed:', e));
}

/**
 * Updates the Quote-of-the-day segmented toggle (Off/On) to reflect the
 * given state.
 * @param {boolean} enabled
 */
function setNotifToggleState(enabled) {
    document.querySelectorAll('#notif-toggle [data-notif-toggle-value]').forEach(btn => {
        btn.classList.toggle('is-active', (btn.dataset.notifToggleValue === 'on') === enabled);
    });
    moveToggleIndicator(document.getElementById('notif-toggle'));
}

/**
 * Disables/enables both buttons of the Quote-of-the-day toggle — used on iOS
 * Safari outside of PWA mode, where push notifications aren't available.
 * @param {boolean} disabled
 */
function setNotifToggleDisabled(disabled) {
    const group = document.getElementById('notif-toggle');
    if (!group) return;

    group.querySelectorAll('[data-notif-toggle-value]').forEach(btn => {
        btn.disabled = disabled;
    });
    group.style.opacity = disabled ? '0.4' : '';
}

/**
 * Syncs the notification Settings UI with the current subscription state.
 * @param {boolean} subscribed
 * @param {number} [intervalHours]
 */
function updateNotifUI(subscribed, intervalHours) {
    setNotifToggleState(subscribed);

    if (intervalHours) {
        document.querySelectorAll('#notif-interval-toggle .import-source-tab').forEach(tab => {
            tab.classList.toggle('is-active', tab.dataset.intervalValue === String(intervalHours));
        });
        moveToggleIndicator(document.getElementById('notif-interval-toggle'));
    }
}

/**
 * Bootstrap: registers SW, syncs UI, shows iOS hint if needed.
 * Call once during app init (after auth check).
 */
async function initNotifications() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const iosHint = document.getElementById('notif-ios-hint');

    if (isIOS && !isStandalone) {
        // iOS Safari: push doesn't work without PWA — show hint, disable toggle
        if (iosHint) iosHint.style.display = '';

        setNotifToggleDisabled(true);
        return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        document.getElementById('settings-notif-group')?.style.setProperty('display', 'none');
        return;
    }

    await getSwRegistration();
    const sub = await getCurrentPushSubscription();
    updateNotifUI(!!sub);
}
