CREATE TABLE users(
    id SERIAL PRIMARY KEY,
    provider_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uniq_user ON users(provider_id);

CREATE TABLE houses(
    id SERIAL PRIMARY KEY,
    zpid TEXT NOT NULL UNIQUE,
    zillow_pricing_info JSONB,
    zillow_property_info JSONB,
    zillow_info_updated_at TIMESTAMPTZ
);

CREATE TABLE house_lists(
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id INTEGER NOT NULL,
    FOREIGN KEY(owner_id) REFERENCES users(id)
);

CREATE TYPE access_level AS ENUM ('view', 'edit');
CREATE TABLE house_list_members(
    user_id INTEGER NOT NULL,
    house_list_id INTEGER NOT NULL,
    access_level access_level NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(house_list_id) REFERENCES houses(id),
    PRIMARY KEY (user_id, house_list_id)
);

CREATE TABLE house_list_houses(
    house_id INTEGER NOT NULL,
    house_list_id INTEGER NOT NULL,
    FOREIGN KEY(house_id) REFERENCES houses(id),
    FOREIGN KEY(house_list_id) REFERENCES houses(id),
    PRIMARY KEY (house_id, house_list_id)    
);

CREATE TABLE houses_ignored (
    house_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    FOREIGN KEY(house_id) REFERENCES houses(id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    PRIMARY KEY(house_id, user_id)
);