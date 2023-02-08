const fetch = require("node-fetch");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();

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
    const { role, password, pass_confirm, id } = postBody.input;
    let data;

    // check pass
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
    //hashed
    const hashedPassword = await bcrypt.hash(password, 10);

    // reset

    if (role === "admin") {
        const { data: dataAdmin, errors: errorsAdmin } = await execute({ id: id, password: hashedPassword }, { "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET }, HASURA_RESET_PASS_ADMIN);
        if (errorsAdmin) {
            callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 202, error_code: "ERR_QUERY_FAILED", error_message: "Query admin failed!", }), });
            return;
        }
        data = dataAdmin.update_admin_by_pk
    }

    if (role === "user") {
        const { data: dataUser, errors: errorsUser } = await execute({ id: id, password: hashedPassword }, { "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET }, HASURA_RESET_PASS_USER);
        if (errorsUser) {
            callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 202, error_code: "ERR_QUERY_FAILED", error_message: "Query user failed!", }), });
            return;
        }
        data = dataUser.update_user_by_pk
    }

    const res = {
        statusCode: 200,
        body: JSON.stringify({
            status_code: 200,
            error_code: null,
            error_message: null,
            created_at: data.created_at
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