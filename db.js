const spicedPg = require("spiced-pg");
const { hash, genSalt, compare } = require("bcryptjs");

const { DATABASE_USERNAME, DATABASE_PASSWORD } = require("./secrets.json");
const DATABASE_NAME = "spiced-petition";
const DATABASE_URL = `postgres:${DATABASE_USERNAME}:${DATABASE_PASSWORD}@localhost:5432/${DATABASE_NAME}`;

const db = spicedPg(DATABASE_URL);

// this function organizes SQL tables to be viewed in /signers
function getSignatures() {
    return db
        .query(
            `SELECT users.first_name, users.last_name, user_profiles.*
                FROM users
                JOIN signatures ON users.id = signatures.user_id
                FULL JOIN user_profiles ON users.id = user_profiles.user_id
                WHERE signatures.signature IS NOT NULL
            `
        )
        .then((result) => result.rows);
}

// this function get the SQL signature to be viewed in /thankyou
function getSignatureById(user_id) {
    return db
        .query(`SELECT * FROM signatures WHERE user_id = $1`, [user_id])
        .then((result) => result.rows[0]);
}

// function to capture user
function createSignature({ signature, user_id }) {
    return db
        .query(
            `
        INSERT INTO signatures  (signature, user_id) VALUES ($1, $2) RETURNING *
    `,
            [signature, user_id]
        )
        .then((result) => result.rows[0]);
}

// para esconder a senha
async function hashPassword(password) {
    const salt = await genSalt();
    return hash(password, salt);
}

// function create user aqui eu consigo pegar os dados pelo users
async function createUser({ first_name, last_name, email, password }) {
    const hashedPassword = await hashPassword(password);
    const result = await db.query(
        `
    INSERT INTO users (first_name, last_name, email, password_hash)
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
        [first_name, last_name, email, hashedPassword]
    );
    return result.rows[0];
}

async function createProfile({ age, city, homepage }, user_id) {
    const result = await db.query(
        `
    INSERT INTO user_profiles (age, city, homepage, user_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
        [age, city, homepage, user_id]
    );
    return result.rows[0];
}
//getUserByEmail

async function getUserByEmail(email) {
    const result = await db.query(`SELECT * FROM users WHERE email = $1`, [
        email,
    ]);
    return result.rows[0];
}

// login

async function login({ email, password }) {
    const foundUser = await getUserByEmail(email);
    // console.log("user", foundUser);
    if (!foundUser) {
        return null;
    }
    const match = await compare(password, foundUser.password_hash);
    // console.log("match", match);
    if (!match) {
        return null;
    }
    return foundUser;
}

async function getSignaturesByCity(city) {
    const result = await db.query(
        `
            SELECT first_name, last_name, age, city, homepage 
            FROM users 
            INNER JOIN signatures ON users.id = signatures.user_id
            INNER JOIN user_profiles ON users.id = user_profiles.user_id
            WHERE LOWER(city) = LOWER($1)
            `,
        [city]
    );
    return result.rows;
}

// Edit Profile

async function updateUser({ first_name, last_name, email, user_id }) {
    console.log("teste", first_name, last_name, email, user_id);
    await db
        .query(
            `
        UPDATE users SET first_name=$1, last_name=$2, email=$3
        WHERE id=$4
        RETURNING *        
    `,
            [first_name, last_name, email, user_id]
        )
        .then((result) => result.rows[0]);
}

async function upsertUserProfile({ age, city, homepage, user_id }) {
    const result = await db.query(
        `
        INSERT INTO user_profiles (age, city, homepage, user_id)
        VALUES
            ($1, $2, $3, $4) 
        ON CONFLICT (user_id)
        DO UPDATE SET
            age = $1,
            city = $2,
            homepage = $3
        `,
        [age, city, homepage, user_id]
    );
    return result.rows[0];
}

// Delete
async function deleteSignature(user_id) {
    await db.query(
        `
        DELETE FROM signatures
        WHERE user_id=$1
    `,
        [user_id]
    );
}

module.exports = {
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
};
