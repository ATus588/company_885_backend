const fetch = require("node-fetch");
const jwt = require("jsonwebtoken")
require("dotenv").config();

const HASURA_GET_ADMIN_BY_EMAIL = `query MyQuery($email: String!) {
  admin(where: {email: {_eq: $email}}) {
    id
    status
  }
}
`


module.exports.handler = async (event, context, callback) => {
    const postBody = JSON.parse(event.body);
    const { token } = postBody.input;

    // decode token
    const { email, admin_id, exp } = jwt.decode(token, process.env.JWT_ENCRYPTION_KEY);

    // check status

    const { data: dataAdmin, errors: errorsAdmin } = await execute({ email: email }, { "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET }, HASURA_GET_ADMIN_BY_EMAIL);
    if (errorsAdmin) {
        callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 202, error_code: "ERR_QUERY_FAILED", error_message: "Query admin failed!", }), });
        return;
    }
    if (dataAdmin.admin.length === 0) {
        callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 404, error_code: "ERR_ADMIN_NOT_FOUND", error_message: "Can't find this admin", }), });
        return;
    }
    if (dataAdmin.admin[0].status !== 0) {
        callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 403, error_code: "ERR_PASSWORD_SET", error_message: "This account password has already been set", }), });
        return;
    }
    if ((Math.floor(Date.now() / 1000)) > exp) {
        callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 401, error_code: "ERR_TOKEN_EXPIRED", error_message: "This token has been expired", }), });
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