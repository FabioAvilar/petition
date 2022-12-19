const path = require("path");
const express = require("express");
const { engine } = require("express-handlebars");

const {
    getSignatures,
    createSignature,
    getSignatureById,
    createUser,
    login,
    createProfile,
    getSignaturesByCity,
    updateUser,
    upsertUserProfile,
    deleteSignature,
} = require("./db");

const app = express();
app.engine("handlebars", engine());
app.set("view engine", "handlebars");

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));

// #1 require the package
const cookieSession = require("cookie-session");

// #2 require the session secret from secrets.json
// it may be any string for now,
// in a production environment it will be generated via a secure tool
const { SESSION_SECRET } = require("./secrets.json");

// #3 setup the middleware

app.use(
    cookieSession({
        secret: SESSION_SECRET,
        maxAge: 1000 * 60 * 60 * 24 * 14,
        sameSite: true,
    })
);

app.use(function (req, res, next) {
    console.log(req.url, req.session);
    next();
});

// first page Welcome!
app.get("/", (req, res) => {
    res.render("welcome", {
        title: "Welcome",
    });
});

// page for registrer user
app.get("/register", (req, res) => {
    if (req.session.user_id) {
        res.redirect("/profile");
    } else {
        res.render("register");
    }
});

app.post("/register", async (req, res) => {
    try {
        const newUser = await createUser(req.body);
        req.session.user_id = newUser.id;
        res.redirect("/profile");
    } catch (error) {
        console.log("ERROR register", error);
    }
});

app.get("/profile", (req, res) => {
    if (!req.session.user_id) {
        res.redirect("/register");
    } else {
        res.render("profile");
    }
});

app.post("/profile", async (req, res) => {
    try {
        let { age } = req.body;
        if (age == "") {
            age = null;
        }

        console.log("PROFILE POST", req.session);
        await createProfile(req.body, req.session.user_id);
        res.redirect("/petition");
    } catch (error) {
        console.log("POST profile error", error);
    }
});

// Login
// get page for login
app.get("/login", (req, res) => {
    if (req.session.user_id) {
        res.redirect("/petition");
        return;
    }
    res.render("login");
});

app.post("/login", async (req, res) => {
    try {
        const loggedUser = await login(req.body);
        req.session.user_id = loggedUser.id;

        res.redirect("/petition");
    } catch (error) {
        console.log("ERROR login POST", error);
        res.render("/login", { error: "Something went wrong" });
    }
});

app.get("/petition", async (req, res) => {
    const user_id = req.session.user_id;
    console.log("PETITION sig_id", req.session);
    if (!user_id) {
        res.redirect("/register");
        return;
    }
    const signature_id = await getSignatureById(user_id);

    if (signature_id) {
        req.session.signature_id = signature_id.id;
        res.redirect("/thankyou");
        return;
    }
    // console.log("response", res);
    res.render("petition");
});

// post datas in sql
app.post("/petition", async (req, res) => {
    console.log("petition");
    try {
        const newSignature = await createSignature({
            signature: req.body.signature,
            user_id: req.session.user_id,
        });
        req.session.signature_id = newSignature.id;
        // salva signature in session
        console.log("newSignature", newSignature);
        res.redirect("/thankyou");
    } catch (err) {
        console.log("Errou Panaca: ", err);
        res.render("petition", { err: "Ops! pay atention!!!" });
    }
});

// page signed thanks
app.get("/thankyou", async (req, res) => {
    console.log("request", req.session);
    const sigId = req.session.user_id;

    if (!req.session.signature_id) {
        res.redirect("/petition");
        return;
    }

    try {
        const signer = await getSignatureById(sigId);
        const signers = await getSignatures();
        res.render("thankyou", { signer, signers });
    } catch (err) {
        console.log("err", err);
    }
});

app.post("/thankyou", async (req, res) => {
    try {
        await deleteSignature(req.session.user_id);
        res.redirect("/petition");
    } catch (err) {
        console.log("err Fabio : ", err);
    }
});

// list users
app.get("/signers", async (req, res) => {
    const signers = await getSignatures();
    res.render("signers", { signers });
});

app.get("/signers/:city", async (req, res) => {
    const { city } = req.params;

    const signers = await getSignaturesByCity(city);
    console.log("signers: ", signers);
    res.render("cityId", { signers, city });
});

app.get("/logout", (req, res) => {
    (req.session = null), res.redirect("/");
});

// for edit page
app.get("/profile/edit", (req, res) => {
    res.render("edit", {
        title: "Edit Profile",
    });
});

app.post("/profile/edit", async (req, res) => {
    try {
        const { user_id } = req.session;
        await updateUser({
            ...req.body,
            user_id,
        });
        await upsertUserProfile({
            ...req.body,
            user_id,
        });
        res.redirect("/thankyou");
    } catch (err) {
        console.log("POST /profile/edit", err);
        res.render("edit", {
            err: "Opps wrong 😬",
        });
    }
});

app.listen(3030, () =>
    console.log("Server started good luck 🥲 http://localhost:3030")
);
