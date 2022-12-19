DROP TABLE IF EXISTS signatures;
DROP TABLE IF EXISTS user_profiles;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE signatures (
    id SERIAL PRIMARY KEY,
    signature VARCHAR NOT NULL CHECK (signature != ''), 
    user_id INT NOT NULL UNIQUE REFERENCES users(id)
);

CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    age INTEGER,
    city VARCHAR(50),
    homepage VARCHAR(255),
    user_id INT NOT NULL UNIQUE REFERENCES users(id)
)


