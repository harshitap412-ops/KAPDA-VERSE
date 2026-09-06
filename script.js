const form = document.getElementById("profileForm");

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function () {
            resolve(reader.result);
        };

        reader.onerror = function () {
            reject(new Error("Failed to read uploaded photo."));
        };

        reader.readAsDataURL(file);
    });
}

if (form) {
    form.addEventListener("submit", async function(event) {
        event.preventDefault();

        const name = document.getElementById("name").value.trim();
        const number = document.getElementById("number").value.trim();
        const age = document.getElementById("age").value.trim();
        const gender = document.getElementById("gender").value;
        const skinTone = document.getElementById("skinTone").value;
        const bodyShape = document.getElementById("bodyShape").value;
        const faceShape = document.getElementById("faceShape").value;
        const hairStyle = document.getElementById("hairStyle").value;
        const photoInput = document.getElementById("photo");

        if (!name || !number || !age || !gender || !skinTone ||
            !bodyShape || !faceShape || !hairStyle) {
            alert("Please fill in all profile details before continuing.");
            return;
        }

        let photo = "";

        if (photoInput && photoInput.files && photoInput.files[0]) {
            const file = photoInput.files[0];

            if (!file.type.startsWith("image/")) {
                alert("Please upload a valid image file.");
                return;
            }

            try {
                photo = await readFileAsDataUrl(file);
            } catch (error) {
                alert(error.message);
                return;
            }
        }

        const profile = {
            name,
            number,
            age,
            gender,
            skinTone,
            bodyShape,
            faceShape,
            hairStyle,
            photo
        };

        localStorage.setItem(
            "kapdaVerseProfile",
            JSON.stringify(profile)
        );

        const dashboardPath = window.location.hostname.endsWith("github.io")
            ? "dashboard.html"
            : "pages/dashboard.html";

        window.location.assign(
            new URL(dashboardPath, document.baseURI).href
        );
    });
}
