const fetch = require("node-fetch");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const moment = require("moment");

const HASURA_OPERATION_GET_USER_BY_EMAIL = `
query MyQuery($email: String!) {
  user(where: {email: {_eq: $email}}) {
    firstname
    lastname
    id
    password
    avatar_url
  }
}

`;

module.exports.handler = async (event, context, callback) => {
    const postBody = JSON.parse(event.body);
    const email = postBody.input.email.toLowerCase();
    const password = postBody.input.password;

    // Get user info
    const { data, errors } = await execute({ email: email }, { "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET_APP }, HASURA_OPERATION_GET_USER_BY_EMAIL);
    console.log("data", data);
    if (errors) {
        callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 202, error_code: "ERR_QUERY_FAILED", error_message: "Query failed!", }), });
        return;
    }
    if (data.user.length === 0) {
        callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 202, error_code: "ERR_USER_NOT_FOUND", error_message: "User not found", }), });
        return;
    }


    // check password
    const check = await bcrypt.compare(password, data.user[0].password);
    if (check === false) {
        callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 305, error_code: "ERR_PASSWORD_INCORRECT", error_message: "Password or email incorrect", }), });
        return;
    }

    // generate jwt token
    const tokenContents = {
        sub: email.toString(),
        email: email,
        iat: Date.now() / 1000,
        "https://hasura.io/jwt/claims": {
            "x-hasura-allowed-roles": ["user"],
            "x-hasura-login-key": email.toString(),
            "x-hasura-default-role": "user",
            "x-hasura-role": "user",
            "x-hasura-user-id": data.user[0].id.toString(),
        },
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    };

    const ExpireDate = moment()
        .add(30, "days")
        .utcOffset("+0700")
        .format("YYYY-MM-DD");

    const token = jwt.sign(tokenContents, process.env.JWT_ENCRYPTION_KEY);

    const res = {
        statusCode: 200,
        body: JSON.stringify({
            role: "user",
            email: email,
            user_id: data.user[0].id,
            token: token,
            status_code: 200,
            name: data.user[0].firstname + data.user[0].lastname,
            expire_date: ExpireDate,
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
