const fetch = require("node-fetch");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const HASURA_GET_ADMIN_BY_EMAIL = `query MyQuery($email: String!) {
  admin(where: {email: {_eq: $email}}) {
    id
    status
  }
}
`
const HASURA_GET_USER_BY_EMAIL = `
query MyQuery($email: String!) {
  user(where: {email: {_eq: $email}}) {
    id
    status
  }
}
`
const HASURA_RESET_PASS_ADMIN = `mutation MyMutation($id: Int!, $password: String!) {
  update_admin_by_pk(pk_columns: {id: $id}, _set: {password: $password, status: 1}) {
    status
    created_at
  }
}
`
const HASURA_RESET_PASS_USER = `mutation MyMutation($id: Int!, $password: String!) {
  update_user_by_pk(pk_columns: {id: $id}, _set: {password: $password, status: 1}) {
    status
    created_at
  }
}

`


module.exports.handler = async (event, context, callback) => {
    const postBody = JSON.parse(event.body);
    const { token, password, pass_confirm } = postBody.input;

    //check input
    if (password == '') {
        callback(null, {
            statusCode: 202,
            body: JSON.stringify({
                status_code: 202,
                error_code: "ERR_NULL_PASSWORD",
                error_message: "Please insert a valid password",
            }),
        });
        return;
    }

    if (password !== pass_confirm) {
        callback(null, {
            statusCode: 202,
            body: JSON.stringify({
                status_code: 202,
                error_code: "ERR_WRONG_PASS_CONFIRM",
                error_message: "Password and confirm password has to be the same",
            }),
        });
        return;
    }

    // decode token
    const { email, exp, role, id } = jwt.decode(token, process.env.JWT_ENCRYPTION_KEY);

    console.log(role, email)
    // check status

    if (role === "admin") {
        const { data: dataAdmin, errors: errorsAdmin } = await execute({ email: email }, { "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET }, HASURA_GET_ADMIN_BY_EMAIL);
        if (errorsAdmin) {
            callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 202, error_code: "ERR_QUERY_FAILED", error_message: "Query admin failed!", }), });
            return;
        }
        if (dataAdmin.admin.length === 0) {
            callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 404, error_code: "ERR_ADMIN_NOT_FOUND", error_message: "Can't find this admin", }), });
            return;
        }
        if (dataAdmin.admin[0].status !== 2) {
            callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 403, error_code: "ERR_PASSWORD_SET", error_message: "This account password has already been reset", }), });
            return;
        }
    }

    if (role === "user") {
        const { data: dataUser, errors: errorsUser } = await execute({ email: email }, { "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET }, HASURA_GET_USER_BY_EMAIL);
        if (errorsUser) {
            callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 202, error_code: "ERR_QUERY_FAILED", error_message: "Query user failed!", }), });
            return;
        }
        if (dataUser.user.length === 0) {
            callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 404, error_code: "ERR_USER_NOT_FOUND", error_message: "Can't find user with this email", }), });
            return;
        }
        if (dataUser.user[0].status !== 2) {
            callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 403, error_code: "ERR_PASSWORD_SET", error_message: "This account password has already been reset", }), });
            return;
        }
    }


    //check expire
    if ((Math.floor(Date.now() / 1000)) > exp) {
        callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 401, error_code: "ERR_TOKEN_EXPIRED", error_message: "This token has been expired", }), });
        return;
    }
    //hashed
    const hashedPassword = await bcrypt.hash(password, 10);
    if (role === "admin") {
        const { data: dataAdmin, errors: errorsAdmin } = await execute({ id: id, password: hashedPassword }, { "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET }, HASURA_RESET_PASS_ADMIN);
        if (errorsAdmin) {
            callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 202, error_code: "ERR_QUERY_FAILED", error_message: "Query admin failed!", }), });
            return;
        }
    }

    if (role === "user") {
        const { data: dataUser, errors: errorsUser } = await execute({ id: id, password: hashedPassword }, { "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET }, HASURA_RESET_PASS_USER);
        if (errorsUser) {
            callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 202, error_code: "ERR_QUERY_FAILED", error_message: "Query user failed!", }), });
            return;
        }
    }

    const res = {
        statusCode: 200,
        body: JSON.stringify({
            status_code: 200,
            error_code: null,
            error_message: null,
        }),
    };
    return res;

}

const execute = async (variables, reqHeaders, hasura_operation) => {
    const fetchResponse = await fetch(process.env.HASURA_ENDPOINT, {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify({
            query: hasura_operation,
            variables,
        }),
    });
    return await fetchResponse.json();
};