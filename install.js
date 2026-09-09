let deferredInstallPrompt = null;
const installBanner = document.getElementById("installBanner");
const installButton = document.getElementById("installButton");
const installClose = document.getElementById("installClose");

function showInstallBanner() {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;

    if (installBanner && window.location.protocol !== "file:" && !isStandalone && !sessionStorage.getItem("kapdaVerseInstallClosed")) {
        installBanner.hidden = false;
    }
}

showInstallBanner();

if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
    window.addEventListener("load", function() {
        navigator.serviceWorker.register("./sw.js").catch(function(error) {
            console.warn("Kapda Verse offline mode could not start.", error);
        });
    });
}

window.addEventListener("beforeinstallprompt", function(event) {
    event.preventDefault();
    deferredInstallPrompt = event;

    showInstallBanner();
});

if (installButton) {
    installButton.addEventListener("click", async function() {
        if (!deferredInstallPrompt) {
            alert("Browser menu se 'Install Kapda Verse' ya 'Add to Home Screen' choose karo.");
            return;
        }

        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        installBanner.hidden = true;
    });
}

if (installClose) {
    installClose.addEventListener("click", function() {
        installBanner.hidden = true;
        sessionStorage.setItem("kapdaVerseInstallClosed", "1");
    });
}

window.addEventListener("appinstalled", function() {
    if (installBanner) {
        installBanner.hidden = true;
    }
    deferredInstallPrompt = null;
});
