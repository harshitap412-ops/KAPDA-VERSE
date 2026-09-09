const savedProfile = localStorage.getItem("kapdaVerseProfile");
const isEditingProfile = new URLSearchParams(window.location.search).get("edit") === "1";

if (savedProfile && !isEditingProfile) {
    const dashboardPath = window.location.hostname.endsWith("github.io")
        ? "dashboard.html"
        : "pages/dashboard.html";

    window.location.replace(
        new URL(dashboardPath, document.baseURI).href
    );
}

const form = document.getElementById("profileForm");
const useRemoteAuth = Boolean(window.kapdaSupabase) && window.location.protocol !== "file:";
const emailField = document.getElementById("email");
const passwordField = document.getElementById("password");

if (emailField && passwordField) {
    emailField.required = useRemoteAuth;
    passwordField.required = useRemoteAuth;
}

function getProfilePayload(profile, userId) {
    return {
        id: userId,
        name: profile.name,
        mobile: profile.number,
        age: Number(profile.age),
        gender: profile.gender,
        skin_tone: profile.skinTone,
        body_shape: profile.bodyShape,
        face_shape: profile.faceShape,
        hair_style: profile.hairStyle,
        updated_at: new Date().toISOString()
    };
}

async function saveProfileToSupabase(profile, authData) {
    if (!window.kapdaSupabase || !authData || !authData.user) {
        return {success: false, pendingConfirmation: true};
    }

    const result = await window.kapdaSupabase
        .from("profiles")
        .upsert(getProfilePayload(profile, authData.user.id));

    if (result.error) {
        return {success: false, error: result.error.message};
    }

    return {success: true};
}

function populateSavedProfile() {
    if (!form || !isEditingProfile || !savedProfile) {
        return;
    }

    try {
        const profile = JSON.parse(savedProfile);

        Object.keys(profile).forEach(function(key) {
            const field = document.getElementById(key);

            if (field && key !== "photo") {
                field.value = profile[key];
            }
        });
    } catch (error) {
        localStorage.removeItem("kapdaVerseProfile");
    }
}

populateSavedProfile();

function updateShapeUpload(type) {
    const select = document.getElementById(type + "Shape");
    const panel = document.getElementById(type + "Analysis");
    const input = document.getElementById(type + "Photo");

    if (!select || !panel || !input) {
        return;
    }

    const needsPhoto = select.value === "dont-know";
    panel.hidden = !needsPhoto;
    input.required = needsPhoto;
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);

        image.onload = function() {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };

        image.onerror = function() {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("We could not read that image. Please try another one."));
        };

        image.src = objectUrl;
    });
}

function detectFaceShape(file) {
    return new Promise(async (resolve, reject) => {
        try {
            const image = await loadImage(file);
            const faceMesh = new FaceMesh({
                locateFile: function(path) {
                    return "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/" + path;
                }
            });

            faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.6,
                minTrackingConfidence: 0.6
            });

            faceMesh.onResults(function(results) {
                const landmarks = results.multiFaceLandmarks && results.multiFaceLandmarks[0];

                if (!landmarks) {
                    reject(new Error("No face found. Please upload a clear front-facing photo."));
                    return;
                }

                const width = Math.abs(landmarks[454].x - landmarks[234].x);
                const height = Math.abs(landmarks[152].y - landmarks[10].y);
                const ratio = width / height;
                const detectedShape = ratio < 0.72
                    ? "Long"
                    : ratio < 0.86
                        ? "Oval"
                        : ratio < 0.98
                            ? "Heart"
                            : ratio < 1.08
                                ? "Square"
                                : ratio < 1.2
                                    ? "Round"
                                    : "Diamond";

                resolve(detectedShape);
                faceMesh.close();
            });

            await faceMesh.send({image: image});
        } catch (error) {
            reject(new Error("Face AI could not load. Check your internet connection and try again."));
        }
    });
}

function detectBodyShape(file) {
    return new Promise(async (resolve, reject) => {
        try {
            const image = await loadImage(file);
            const pose = new Pose({
                locateFile: function(path) {
                    return "https://cdn.jsdelivr.net/npm/@mediapipe/pose/" + path;
                }
            });

            pose.setOptions({
                modelComplexity: 1,
                smoothLandmarks: true,
                enableSegmentation: false,
                minDetectionConfidence: 0.6,
                minTrackingConfidence: 0.6
            });

            pose.onResults(function(results) {
                const landmarks = results.poseLandmarks;

                if (!landmarks) {
                    reject(new Error("No full body found. Please upload a clear standing photo."));
                    return;
                }

                const shoulderWidth = Math.abs(landmarks[11].x - landmarks[12].x);
                const hipWidth = Math.abs(landmarks[23].x - landmarks[24].x);
                const shoulderHipRatio = shoulderWidth / hipWidth;
                const detectedShape = shoulderHipRatio > 1.25
                    ? "Inverted Triangle"
                    : shoulderHipRatio < 0.82
                        ? "Triangle"
                        : shoulderHipRatio > 1.05
                            ? "Rectangle"
                            : "Hourglass";

                resolve(detectedShape);
                pose.close();
            });

            await pose.send({image: image});
        } catch (error) {
            reject(new Error("Body AI could not load. Check your internet connection and try again."));
        }
    });
}

function detectShapeFromImage(file, type) {
    return type === "face"
        ? detectFaceShape(file)
        : detectBodyShape(file);
}

async function analyzeShape(type) {
    const input = document.getElementById(type + "Photo");
    const select = document.getElementById(type + "Shape");
    const status = document.getElementById(type + "AnalysisStatus");
    const file = input && input.files[0];

    if (!file) {
        return;
    }

    if (!file.type.startsWith("image/")) {
        status.textContent = "Please choose an image file.";
        input.value = "";
        return;
    }

    status.textContent = "Analyzing your photo...";

    try {
        const detectedShape = await detectShapeFromImage(file, type);
        select.value = detectedShape;
        status.textContent = "Estimated shape: " + detectedShape + ". You can change it if needed.";
        input.required = false;
        showShapeResult(type, detectedShape);
    } catch (error) {
        status.textContent = error.message;
    }
}

function showShapeResult(type, detectedShape) {
    const results = document.getElementById("shapeResults");
    const result = document.getElementById(type + "ShapeResult");

    if (!results || !result) {
        return;
    }

    result.textContent = (type === "face" ? "Face shape: " : "Body shape: ") + detectedShape;
    results.hidden = false;
}

const bodyShapeSelect = document.getElementById("bodyShape");
const faceShapeSelect = document.getElementById("faceShape");

if (bodyShapeSelect) {
    bodyShapeSelect.addEventListener("change", function() {
        updateShapeUpload("body");
    });
}

if (faceShapeSelect) {
    faceShapeSelect.addEventListener("change", function() {
        updateShapeUpload("face");
    });
}

const bodyPhoto = document.getElementById("bodyPhoto");
const facePhoto = document.getElementById("facePhoto");
const cameraStreams = {};

async function startCamera(type) {
    const video = document.getElementById(type + "Camera");
    const captureButton = document.querySelector('[data-capture-type="' + type + '"]');
    const status = document.getElementById(type + "AnalysisStatus");

    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        status.textContent = "Camera ke liye website ko localhost ya HTTPS par open karo. Filhaal Choose File use kar sakte ho.";
        return;
    }

    try {
        cameraStreams[type] = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: type === "face" ? "user" : "environment" },
            audio: false
        });
        video.srcObject = cameraStreams[type];
        video.hidden = false;
        captureButton.hidden = false;
        status.textContent = "Camera ready. Frame yourself and click the photo button.";
    } catch (error) {
        status.textContent = "Camera permission nahi mili. Browser settings me camera allow karo ya Choose File use karo.";
    }
}

async function captureCameraPhoto(type) {
    const video = document.getElementById(type + "Camera");
    const input = document.getElementById(type + "Photo");
    const stream = cameraStreams[type];

    if (!video || !stream) {
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    canvas.toBlob(function(blob) {
        const file = new File([blob], type + "-camera-photo.jpg", {type: "image/jpeg"});
        const transfer = new DataTransfer();
        transfer.items.add(file);
        input.files = transfer.files;
        stream.getTracks().forEach(function(track) { track.stop(); });
        video.hidden = true;
        document.querySelector('[data-capture-type="' + type + '"]').hidden = true;
        analyzeShape(type);
    }, "image/jpeg", 0.9);
}

document.querySelectorAll("[data-camera-type]").forEach(function(button) {
    button.addEventListener("click", function() {
        startCamera(button.dataset.cameraType);
    });
});

document.querySelectorAll("[data-capture-type]").forEach(function(button) {
    button.addEventListener("click", function() {
        captureCameraPhoto(button.dataset.captureType);
    });
});

if (bodyPhoto) {
    bodyPhoto.addEventListener("change", function() {
        analyzeShape("body");
    });
}

if (facePhoto) {
    facePhoto.addEventListener("change", function() {
        analyzeShape("face");
    });
}

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
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const age = document.getElementById("age").value.trim();
        const gender = document.getElementById("gender").value;
        const skinTone = document.getElementById("skinTone").value;
        const bodyShape = document.getElementById("bodyShape").value;
        const faceShape = document.getElementById("faceShape").value;
        const hairStyle = document.getElementById("hairStyle").value;

        if (!name || !number || !age || !gender || !skinTone || !bodyShape || !faceShape || !hairStyle) {
            alert("Please fill in all profile details before continuing.");
            return;
        }

        if (useRemoteAuth && (!email || !password)) {
            alert("Online account ke liye email aur password fill karo.");
            return;
        }

        if (!/^[0-9]{10}$/.test(number)) {
            alert("Please enter a valid 10-digit mobile number.");
            return;
        }

        const ageNumber = Number(age);

        if (!Number.isInteger(ageNumber) || ageNumber < 13 || ageNumber > 100) {
            alert("Please enter an age between 13 and 100.");
            return;
        }

        if (useRemoteAuth && password.length < 8) {
            alert("Password kam se kam 8 characters ka hona chahiye.");
            return;
        }

        if (bodyShape === "dont-know" || faceShape === "dont-know") {
            alert("Please upload the requested photo so we can estimate your shape.");
            return;
        }

        const profile = {
            name,
            number,
            email,
            age,
            gender,
            skinTone,
            bodyShape,
            faceShape,
            hairStyle
        };

        if (useRemoteAuth) {
            const authResult = await window.kapdaSupabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.href.split("?")[0]
                }
            });

            if (authResult.error) {
                alert("Account create nahi hua: " + authResult.error.message);
                return;
            }

            const profileResult = await saveProfileToSupabase(profile, authResult.data);

            if (profileResult.pendingConfirmation) {
                localStorage.setItem("kapdaVersePendingProfile", JSON.stringify(profile));
                alert("Email par confirmation link bheja hai. Confirm karne ke baad profile automatically sync ho jayegi.");
                return;
            }

            if (!profileResult.success) {
                alert("Profile save nahi hui: " + profileResult.error);
                return;
            }
        }

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