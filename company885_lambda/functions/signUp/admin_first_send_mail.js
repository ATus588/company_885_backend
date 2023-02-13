const fetch = require("node-fetch");
const jwt = require("jsonwebtoken");
const Sib = require("sib-api-v3-sdk")
require("dotenv").config();


const HASURA_OPERATION_INSERT_NEW_ADMIN_INFO = `
mutation MyMutation($admin_id: Int!, $email: String!, $name: String!) {
  insert_admin_one(object: {created_by: $admin_id, status: 0, email: $email, name: $name}) {
    created_at
    id
  }
}
`;

const HASURA_OPERATION_VALIDATE_EMAIL = `
mutation MyMutation3($email: String!) {
  validate_email_signUp(email: $email) {
    error_code
    error_message
    status_code
  }
}
`;

// send mail init
const client = Sib.ApiClient.instance;
const apiKey = client.authentications['api-key'];
apiKey.apiKey = process.env.SIB_API_KEY;

const tranEmailApi = new Sib.TransactionalEmailsApi();

module.exports.handler = async (event, context, callback) => {
    // handle input
    const postBody = JSON.parse(event.body);
    const { name, email, admin_id } = postBody.input;

    if (email === '' || name === '') {
        callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 202, error_code: "ERR_NULL_VALUE", error_message: "Email and name must not NULL", }), });
        return;
    }

    //validate
    const { data: dataValidate, errors: errValidate } = await execute(
        { email: email },
        { "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET_APP },
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

    //insert new admin data
    const { data: data, errors: err } = await execute({ admin_id: admin_id, email: email, name: name }, { "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET },
        HASURA_OPERATION_INSERT_NEW_ADMIN_INFO);
    if (err) {
        callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 202, error_code: "ERR_QUERY_FAILED", error_message: "Query failed!", }), });
        return;
    }
    const new_admin_id = data.insert_admin_one.id;

    const tokenContents = {
        sub: email.toString(),
        email: email,
        admin_id: new_admin_id,
        iat: Date.now() / 1000,
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    };

    const token = jwt.sign(tokenContents, process.env.JWT_ENCRYPTION_KEY);
    console.log(token)

    //html content
    const htmlContent = `
    <h2>Our dearest welcome!<h2>
    <h3>One of our admin has invited you to be an admin of our Company<h3>
    <h3>Please enter the token below to proceed to set password pages<h3>
    <div>-----------------------------------------------</div>
    <p>${token}</p>
    <div>-----------------------------------------------</div>
    <h3>Thank you for using our services</h3>
    `

    // sender, receiver
    const from = {
        email: "anhtutran885@gmail.com",
    }
    const to = [
        { email: email.toString() }
    ]

    // send email

    const sending = await Promise.all([sendMail(from, to, htmlContent, name)])


    // response
    const res = {
        statusCode: 200,
        body: JSON.stringify({
            status_code: 200,
            error_code: null,
            error_message: null,
            created_at: data.insert_admin_one.created_at
        }),
    };
    return res;
};

const sendMail = async (from, to, content, name) => {
    const msg = {
        sender: from,
        to: to,
        subject: "Welcome to The Company, " + name.toString(),
        htmlContent: content
    }
    console.log(msg);
    return await tranEmailApi.sendTransacEmail(msg).then(console.log).catch(console.log)
}



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

