import { Pool } from "pg";
import { URL } from "url";
import { TokenPayload } from "google-auth-library/build/src/auth/loginticket";

const databaseUrl = new URL(process.env.DATABASE_URL);
const pool = new Pool({
  host: databaseUrl.hostname,
  port: +(databaseUrl.port || 5432),
  connectionTimeoutMillis: +(process.env.DATABASE_TIMEOUT || 2000),
  max: 10,
  user: databaseUrl.username,
  password: databaseUrl.password,
  database: databaseUrl.pathname.substring(1)
});

export interface User {
  id: number;
  provider_id: string;
  provider: string;
  email: string;
  created_at: Date;
}

export interface House {
  id: number;
  zpid: string;
  zillow_pricing_info?: JSON;
  zillow_property_info?: JSON;
  zillow_info_updated_at?: Date;
}

export interface HouseList {
  id: number;
  name: string;
}

// TODO query result . rowcount validation

export async function hasHouseListAccessRW(
  houseListId: number,
  userId: number
): Promise<boolean> {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `
        select * from (
            select user_id from house_list_members where house_list_id = $1 and user_id = $2 and access_level = $3
        ) membership UNION (
            select owner_id as user_id from house_lists where owner_id = $2 and id = $1
        )`,
      [houseListId, userId, "edit"]
    );
    // any rows means we have edit or owner access
    return res.rowCount !== 0;
  } finally {
    client.release();
  }
}

export async function createHouseList(
  name: string,
  ownerId: number
): Promise<HouseList> {
  const client = await pool.connect();
  try {
    const res = await client.query(
      "insert into house_lists(name, owner_id) values ($1, $2) returning *",
      [name, ownerId]
    );
    return res.rows[0];
  } finally {
    client.release();
  }
}

export async function updateHouse(
  zpid: string,
  zpricing: JSON,
  zproperty: JSON,
  zupdated?: Date
): Promise<void> {
  const client = await pool.connect();
  try {
    const res = await client.query(
      "update houses set zillow_pricing_info = $1, zillow_property_info = $2, zillow_info_updated_at = $3 where zpid = $4",
      [
        JSON.stringify(zpricing),
        JSON.stringify(zproperty),
        zupdated || new Date(),
        zpid
      ]
    );
    if (res.rowCount !== 1) {
      throw new Error(`House with zpid ${zpid} not found`);
    }
  } finally {
    client.release();
  }
}

// TODO cascade
export async function deleteHouseList(houseListId: number): Promise<HouseList> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const res = await client.query("select * from house_lists where id = $1", [
      houseListId
    ]);
    let houseList: HouseList;
    if (res.rowCount === 1) {
      houseList = res.rows[0];
    }
    await client.query("delete from house_lists where id = $1", [houseListId]);
    await client.query("commit");
    return houseList;
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

export async function addHouseToList(
  zpid: string,
  houseListId: number
): Promise<House> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    let res = await client.query(
      "select * from house_lists where id = $1 limit 1",
      [houseListId]
    );
    if (res.rowCount === 0) {
      throw new Error(`HouseList with id ${houseListId} not found`);
    }

    res = await client.query("select * from houses where zpid = $1", [zpid]);
    if (res.rowCount === 0) {
      res = await client.query(
        "insert into houses(zpid) values ($1) returning *",
        [zpid]
      );
    }
    const house: House = res.rows[0];

    res = await client.query(
      "select * from house_list_houses where house_list_id = $1 and house_id = $2",
      [houseListId, house.id]
    );

    if (res.rowCount === 0) {
      await client.query(
        "insert into house_list_houses(house_list_id, house_id) values ($1, $2)",
        [houseListId, house.id]
      );
    }

    await client.query("commit");
    return house;
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

export async function removeHouseFromList(
  zpid: string,
  houseListId: number
): Promise<House> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    let res = await client.query(
      "select * from house_lists where id = $1 limit 1",
      [houseListId]
    );
    if (res.rowCount === 0) {
      throw new Error(`HouseList with id ${houseListId} not found`);
    }

    res = await client.query("select * from houses where zpid = $1", [zpid]);
    if (res.rowCount !== 1) {
      throw new Error(`House with zpid ${zpid} not found`);
    }
    const house: House = res.rows[0];

    res = await client.query(
      "select * from house_list_houses where house_list_id = $1 and house_id = $2",
      [houseListId, house.id]
    );

    if (res.rowCount === 0) {
      throw new Error(
        `House with zpid ${zpid} not found in HouseList with id ${houseListId}`
      );
    }

    res = await client.query(
      "delete from house_list_houses where house_list_id = $1 and house_id = $2",
      [houseListId, house.id]
    );

    await client.query("commit");
    return res.rowCount === 1 ? house : null;
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

export async function addUserToList(
  email: string,
  houseListId: number
): Promise<User> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    let res = await client.query(
      "select * from house_lists where id = $1 limit 1",
      [houseListId]
    );
    if (res.rowCount === 0) {
      throw new Error(`HouseList with id ${houseListId} not found`);
    }

    res = await client.query("select * from users where email = $1 limit 1", [
      email
    ]);
    if (res.rowCount === 0) {
      throw new Error(
        `User with email ${email} not found. Have they logged in yet?`
      );
    }
    const user: User = res.rows[0];

    res = await client.query(
      "select * from house_list_members where house_list_id = $1 and user_id = $2",
      [houseListId, user.id]
    );

    if (res.rowCount === 0) {
      await client.query(
        "insert into house_list_members(house_list_id, user_id, access_level) values ($1, $2, $3)",
        [houseListId, user.id, "edit"]
      );
    }

    await client.query("commit");
    return user;
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

export async function removeUserFromList(
  id: string,
  houseListId: number
): Promise<User> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    let res = await client.query(
      "select * from house_lists where id = $1 limit 1",
      [houseListId]
    );
    if (res.rowCount === 0) {
      throw new Error(`HouseList with id ${houseListId} not found`);
    }
    res = await client.query("select * from users where id = $1 limit 1", [id]);
    if (res.rowCount === 0) {
      throw new Error(`User with id ${id} not found. Have they logged in yet?`);
    }
    const user: User = res.rows[0];
    res = await client.query(
      "delete from house_list_members where house_list_id = $1 and user_id = $2",
      [houseListId, id]
    );
    await client.query("commit");
    return res.rowCount === 1 ? user : null;
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

export async function houseListsByOwnerId(
  ownerId: number
): Promise<HouseList[]> {
  const client = await pool.connect();
  try {
    const houseLists = await client.query(
      "select * from house_lists where owner_id = $1",
      [ownerId]
    );
    return houseLists.rows;
  } finally {
    client.release();
  }
}
export async function houseListsViaMembershipByUserId(
  userId: number
): Promise<HouseList[]> {
  const client = await pool.connect();
  try {
    const houseLists = await client.query(
      "select * from house_lists WHERE id in (select distinct(house_list_id) from house_list_members where user_id = $1)",
      [userId]
    );
    return houseLists.rows;
  } finally {
    client.release();
  }
}
export async function usersViaMembershipByHouseListID(
  houseListId: number
): Promise<User[]> {
  const client = await pool.connect();
  try {
    const users = await client.query(
      "select * from users where id in (select user_id from house_list_members where house_list_id = $1)",
      [houseListId]
    );
    return users.rows;
  } finally {
    client.release();
  }
}
export async function userById(userId: number): Promise<User> {
  const client = await pool.connect();
  try {
    const user = await client.query("select * from users where id = $1", [
      userId
    ]);
    return user.rows[0];
  } finally {
    client.release();
  }
}
export async function housesViaMembershipByHouseListID(
  houseListId: number
): Promise<House[]> {
  const client = await pool.connect();
  try {
    const users = await client.query(
      "select * from houses where id in (select house_id from house_list_houses where house_list_id = $1)",
      [houseListId]
    );
    return users.rows;
  } finally {
    client.release();
  }
}
export async function createUserFromPrincipal(
  principal: TokenPayload
): Promise<User> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    let res = await client.query(
      "select * from users where provider_id = $1 and provider = $2",
      [principal.sub, "google"]
    );
    if (res.rowCount === 0) {
      res = await client.query(
        "insert into users(provider_id, provider, email, created_at) values ($1, $2, $3, $4) returning *",
        [principal.sub, "google", principal.email, new Date()]
      );
    }
    await client.query("commit");
    return res.rows[0];
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}
