const fetch = require("node-fetch");
const bcrypt = require('bcryptjs');
require("dotenv").config();

const execute = async (variables, reqHeaders, hasura_operation) => {
    const fetchResponse = await fetch(process.env.HASURA_ENDPOINT, {
        method: "POST",
        headers:
            { "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET } || {},
        body: JSON.stringify({
            query: hasura_operation,
            variables,
        }),
    });
    return await fetchResponse.json();
};

const HASURA_OPERATION_UPDATE_PASSWORD = `
mutation MyMutation($admin_id: Int!, $password: String!) {
  update_admin_by_pk(pk_columns: {id: $admin_id}, _set: {password: $password, status: 1}) {
    password
    status
    email
    created_at
  }
}
`;


module.exports.handler = async (
    event,
    context,
    callback
) => {
    const postBody = JSON.parse(event.body);
    const { password, pass_confirm, admin_id } = postBody.input;

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

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);
    // query execution update password
    const { data: data, errors: err } = await execute(
        { password: hashedPassword, admin_id: admin_id },
        { "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET },
        HASURA_OPERATION_UPDATE_PASSWORD
    );
    if (err) {
        callback(null, {
            statusCode: 202,
            body: JSON.stringify({
                status_code: 202,
                error_code: "ERR_QUERY_FAIL",
                error_message: "Query failed",
            }),
        });
        return;
    }
    // res
    const body = {
        status_code: 200,
        error_code: null,
        error_message: null
    }
    const res = {
        statusCode: 200,
        body: JSON.stringify(body),
    };
    return res
}
