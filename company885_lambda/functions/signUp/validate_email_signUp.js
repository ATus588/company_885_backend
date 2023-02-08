const fetch = require("node-fetch");
require("dotenv").config();

const HASURA_GET_ADMIN_BY_EMAIL = `query MyQuery($email: String!) {
  admin(where: {email: {_eq: $email}}) {
    name
    id
  }
}
`
const HASURA_GET_USER_BY_EMAIL = `
query MyQuery2($email: String!) {
  user(where: {email: {_eq: $email}}) {
    id
  }
}
`
module.exports.handler = async (event, context, callback) => {
    const postBody = JSON.parse(event.body);
    const email = postBody.input.email;
    console.log(email);

    const { data: dataAdmin, errors: errorsAdmin } = await execute({ email: email }, { "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET }, HASURA_GET_ADMIN_BY_EMAIL);
    if (errorsAdmin) {
        callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 202, error_code: "ERR_QUERY_FAILED", error_message: "Query admin failed!", }), });
        return;
    }
    console.log(dataAdmin);
    if (dataAdmin.admin.length > 0) {
        callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 202, error_code: "ERR_MAIL_UNAVAILABLE", error_message: "This mail has been used by another account", }), });
        return;
    }

    const { data: dataUser, errors: errorsUser } = await execute({ email: email }, { "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET }, HASURA_GET_USER_BY_EMAIL);
    if (errorsUser) {
        callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 202, error_code: "ERR_QUERY_FAILED", error_message: "Query user failed!", }), });
        return;
    }
    if (dataUser.user.length > 0) {
        callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 202, error_code: "ERR_MAIL_UNAVAILABLE", error_message: "This mail has been used by another account", }), });
        return;
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