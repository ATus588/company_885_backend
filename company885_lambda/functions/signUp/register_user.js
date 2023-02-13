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

const HASURA_OPERATION_VALIDATE_EMAIL = `
mutation MyMutation3($email: String!) {
  validate_email_signUp(email: $email) {
    error_code
    error_message
    status_code
  }
}
`;
const HASURA_OPERATION_INSERT_USER = `
mutation MyMutation2($email: String!, $firstname: String!, $password: String!, $phone: String!, $lastname: String!) {
  insert_user_one(object: {email: $email, firstname: $firstname, password: $password, phone: $phone, status: 0, lastname: $lastname}) {
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
    const { email, firstname, lastname, password, phone, pass_confirm } = postBody.input;
    // validate email
    const { data: dataValidate, errors: errValidate } = await execute(
        { email: email },
        { "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET },
        HASURA_OPERATION_VALIDATE_EMAIL
    );
    if (errValidate) {
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
    if (dataValidate.validate_email_signUp.status_code === 202) {
        callback(null, {
            statusCode: 202,
            body: JSON.stringify({
                status_code: 202,
                error_code: dataValidate.validate_email_signUp.error_code,
                error_message: dataValidate.validate_email_signUp.error_message,
            }),
        });
        return;
    }
    // check and hash password
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
    // insert to db
    const { data: dataInsert, errors: errInsert } = await execute(
        { password: hashedPassword, email: email, firstname: firstname, lastname: lastname, phone: phone },
        { "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET },
        HASURA_OPERATION_INSERT_USER
    );
    if (errInsert) {
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
        error_message: null,
        created_at: dataInsert.insert_user_one.created_at
    }
    const res = {
        statusCode: 200,
        body: JSON.stringify(body),
    };
    return res
}
