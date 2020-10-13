DROP TABLE users;
DROP TABLE jobs;
DROP TABLE companies;


CREATE TABLE companies (
    handle TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    num_employees INT,
    description TEXT,
    logo_url TEXT
);

CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    salary FLOAT NOT NULL,
    equity FLOAT NOT NULL,
    company_handle TEXT,
    date_posted TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (equity <= 1),
    CONSTRAINT fk_handle
      FOREIGN KEY(company_handle) 
	  REFERENCES companies(handle)
      ON DELETE CASCADE
);

CREATE TABLE users (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    photo_url TEXT,
    is_admin BOOLEAN NOT NULL DEFAULT false
);


INSERT INTO companies
VALUES ('ibm', 'International Business Machines', 10000, 'Big Blue', 'https://duckduckgo.com/i/f6542513.png'),
       ('apple', 'Apple Computers', 8000, 'Makers of iPhone', 'https://duckduckgo.com/i/b2e38b1b.png');


INSERT INTO jobs (title, salary, equity, company_handle)
VALUES ('Software Engineer', 10000, 0.005, 'ibm'),
       ('Backend Developer', 8000, 0.01, 'apple');

INSERT INTO users
VALUES ('BINGO1', 'password', 'Bill', 'Smith', 'a@b.c', 'https://duckduckgo.com/i/b2e38b1b.png', true),
       ('hamlet', 'okeydokey', 'William', 'Hunt', 'c@b.a', null, false);