const form = document.getElementById("profileForm");

if (form) {

    form.addEventListener("submit", function(event) {

        event.preventDefault();

        const profile = {
            name: document.getElementById("name").value,
            number: document.getElementById("number").value,
            age: document.getElementById("age").value,
            gender: document.getElementById("gender").value,
            skinTone: document.getElementById("skinTone").value,
            bodyShape: document.getElementById("bodyShape").value,
            faceShape: document.getElementById("faceShape").value,
            hairStyle: document.getElementById("hairStyle").value
        };

        localStorage.setItem(
            "kapdaVerseProfile",
            JSON.stringify(profile)
        );

        window.location.href = "pages/dashboard.html";
    });
}