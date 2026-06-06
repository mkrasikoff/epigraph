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
        document.getElementById('notif-toggle').checked = false;
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
        document.getElementById('notif-toggle').checked = false;
        return;
    }

    try {
        // Fetch VAPID public key from backend
        const keyRes = await fetch('/api/push/vapid-public-key');
        const {publicKey} = await keyRes.json();

        if (!publicKey) {
            toast(t('toastPushUnavailable'));
            document.getElementById('notif-toggle').checked = false;
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
        document.getElementById('notif-toggle').checked = false;
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
    if (isGuest) {
        toast(t('toastPushLoginRequired'));
        document.getElementById('notif-toggle').checked = false;
        return;
    }

    const intervalHours = parseInt(
        document.querySelector('#notif-interval-menu .sort-menu-item.active')?.dataset.value || '24', 10
    );

    if (enabled) {
        await subscribeToPush(intervalHours);
    } else {
        await unsubscribeFromPush();
    }
}

/** Toggles the notification interval dropdown menu. */
function toggleNotifIntervalMenu() {
    const btn = document.getElementById('notif-interval-btn');
    const menu = document.getElementById('notif-interval-menu');
    const isOpen = menu.classList.contains('open');

    if (isOpen) {
        closeNotifIntervalMenu();
    } else {
        btn.classList.add('open');
        menu.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
    }
}

/** Closes the notification interval dropdown. */
function closeNotifIntervalMenu() {
    const btn = document.getElementById('notif-interval-btn');
    const menu = document.getElementById('notif-interval-menu');
    btn?.classList.remove('open');
    menu?.classList.remove('open');
    btn?.setAttribute('aria-expanded', 'false');
}

/**
 * Handles selection from the notification interval dropdown.
 * @param {HTMLElement} el - The clicked menu item.
 */
function selectNotifInterval(el) {
    const value = el.dataset.value;
    const label = document.getElementById('notif-interval-label');

    if (label) label.textContent = el.textContent.trim();

    document.querySelectorAll('#notif-interval-menu .sort-menu-item').forEach(item => {
        item.classList.toggle('active', item === el);
    });

    closeNotifIntervalMenu();
    handleNotifIntervalChange(value);
}

function handleNotifIntervalChange(value) {
    fetch('/api/push/interval', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({intervalHours: parseInt(value, 10)})
    }).catch(e => console.error('[Notif] Interval update failed:', e));
}

/**
 * Syncs the notification Settings UI with the current subscription state.
 * @param {boolean} subscribed
 * @param {number} [intervalHours]
 */
function updateNotifUI(subscribed, intervalHours) {
    const toggle = document.getElementById('notif-toggle');
    if (toggle) toggle.checked = subscribed;

    if (intervalHours) {
        const labels = { '6': t('notifInterval6h'), '12': t('notifInterval12h'), '24': t('notifInterval24h') };
        const label = document.getElementById('notif-interval-label');
        if (label) label.textContent = labels[String(intervalHours)] || 'Раз в день';
        document.querySelectorAll('#notif-interval-menu .sort-menu-item').forEach(item => {
            item.classList.toggle('active', item.dataset.value === String(intervalHours));
        });
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

        const toggle = document.getElementById('notif-toggle');

        if (toggle) {
            toggle.disabled = true;
            toggle.closest('label').style.opacity = '0.4';
        }
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
