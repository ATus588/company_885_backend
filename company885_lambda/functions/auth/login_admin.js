const fetch = require("node-fetch");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const moment = require("moment");

const HASURA_OPERATION_GET_ADMIN_BY_EMAIL = `
query MyQuery($email: String!) {
  admin(where: {email: {_eq: $email}}) {
    password
    name
    id
    avatar_url
  }
}
`;

module.exports.handler = async (event, context, callback) => {
    const postBody = JSON.parse(event.body);
    const email = postBody.input.email.toLowerCase();
    const password = postBody.input.password;

    // Get user info
    const { data, errors } = await execute({ email: email }, { "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET_APP }, HASURA_OPERATION_GET_ADMIN_BY_EMAIL);
    console.log("data", data);
    if (errors) {
        callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 202, error_code: "ERR_QUERY_FAILED", error_message: "Query failed!", }), });
        return;
    }
    if (data.admin.length === 0) {
        callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 202, error_code: "ERR_USER_NOT_FOUND", error_message: "user not found", }), });
        return;
    }


    // check password
    const check = await bcrypt.compare(password, data.admin[0].password);
    if (check === false) {
        callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 305, error_code: "ERR_PASSWORD_INCORRECT", error_message: "Password or email incorrect", }), });
        return;
    }

    // generate jwt token
    const tokenContents = {
        iat: Date.now() / 1000,
        "https://hasura.io/jwt/claims": {
            "x-hasura-allowed-roles": ["manager"],
            "x-hasura-login-key": email.toString(),
            "x-hasura-default-role": "manager",
            "x-hasura-role": "manager",
            "x-hasura-user-id": data.admin[0].id.toString(),
        },
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        role: "admin",
        email: email,
        id: data.admin[0].id,
        name: data.admin[0].name,
        avatar_url: data.admin[0].avatar_url || null
    };

    const ExpireDate = moment()
        .add(30, "days")
        .utcOffset("+0700")
        .format("YYYY-MM-DD");

    const token = jwt.sign(tokenContents, process.env.JWT_ENCRYPTION_KEY);

    const res = {
        statusCode: 200,
        body: JSON.stringify({
            role: "admin",
            email: email,
            id: data.admin[0].id,
            token: token,
            status_code: 200,
            name: data.admin[0].name,
            expire_date: ExpireDate,
            error_code: null,
            error_message: null,
            avatar_url: data.admin[0].avatar_url || null
        }),
    };
    return res;
};

const execute = async (variables, reqHeaders, hasura_operation) => {
    const fetchResponse = await fetch(process.env.HASURA_ENDPOINT, {
        method: "POST",
        headers: { "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET } || {},
        body: JSON.stringify({
            query: hasura_operation,
            variables,
        }),
    });
    return await fetchResponse.json();
};
