'use strict';

const path = require('path');
const { createRequire } = require('module');

let pool;

function appRequire(id) {
  // Resolve peer deps from the user's project, not from sdk/
  const fromApp = createRequire(path.join(process.cwd(), 'package.json'));
  return fromApp(id);
}

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    let Pool;
    try {
      ({ Pool } = appRequire('pg'));
    } catch {
      throw new Error('Missing dependency `pg`. Run: npm install pg');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function query(text, params) {
  return getPool().query(text, params);
}

function quoteIdent(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid table or column name: ${name}`);
  }
  return `"${name}"`;
}

function buildWhere(whereObj, startIndex = 1) {
  if (!whereObj || typeof whereObj !== 'object' || Array.isArray(whereObj)) {
    return { clause: '', values: [] };
  }
  const keys = Object.keys(whereObj);
  if (!keys.length) return { clause: '', values: [] };
  const parts = [];
  const values = [];
  let i = startIndex;
  for (const key of keys) {
    parts.push(`${quoteIdent(key)} = $${i++}`);
    values.push(whereObj[key]);
  }
  return { clause: ` WHERE ${parts.join(' AND ')}`, values };
}

function table(name) {
  const tableSql = quoteIdent(name);
  const state = { where: null };

  const api = {
    where(obj) {
      state.where = obj;
      return api;
    },

    async find() {
      const { clause, values } = buildWhere(state.where);
      const result = await query(`SELECT * FROM ${tableSql}${clause}`, values);
      return result.rows;
    },

    async insert(rowOrRows) {
      const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
      if (!rows.length) return [];
      const keys = Object.keys(rows[0] || {});
      if (!keys.length) throw new Error('insert requires at least one column');
      const cols = keys.map(quoteIdent).join(', ');
      const allValues = [];
      const valueGroups = rows.map((row, rowIndex) => {
        const placeholders = keys.map((key, colIndex) => {
          allValues.push(row[key]);
          return `$${rowIndex * keys.length + colIndex + 1}`;
        });
        return `(${placeholders.join(', ')})`;
      });
      const result = await query(
        `INSERT INTO ${tableSql} (${cols}) VALUES ${valueGroups.join(', ')} RETURNING *`,
        allValues
      );
      return Array.isArray(rowOrRows) ? result.rows : result.rows[0];
    },

    async update(patch) {
      if (!state.where || !Object.keys(state.where).length) {
        throw new Error('update() requires where() to avoid updating all rows');
      }
      if (!patch || !Object.keys(patch).length) {
        throw new Error('update() requires a non-empty patch object');
      }
      const setKeys = Object.keys(patch);
      const setParts = [];
      const values = [];
      let i = 1;
      for (const key of setKeys) {
        setParts.push(`${quoteIdent(key)} = $${i++}`);
        values.push(patch[key]);
      }
      const { clause, values: whereValues } = buildWhere(state.where, i);
      values.push(...whereValues);
      const result = await query(
        `UPDATE ${tableSql} SET ${setParts.join(', ')}${clause} RETURNING *`,
        values
      );
      return result.rows;
    },

    async delete() {
      if (!state.where || !Object.keys(state.where).length) {
        throw new Error('delete() requires where() to avoid deleting all rows');
      }
      const { clause, values } = buildWhere(state.where);
      const result = await query(`DELETE FROM ${tableSql}${clause} RETURNING *`, values);
      return result.rows;
    },
  };

  return api;
}

module.exports = { query, table, getPool };
