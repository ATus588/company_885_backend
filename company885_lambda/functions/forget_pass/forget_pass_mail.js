const fetch = require("node-fetch");
const jwt = require("jsonwebtoken");
const Sib = require("sib-api-v3-sdk")
require("dotenv").config();


const HASURA_OPERATION_CHANGE_ADMIN_STATUS = `
mutation MyMutation6($email: String!="tanhtu41@gmail.com") {
  update_admin(_set: {status: 2}, where: {email: {_eq: $email}}) {
    returning {
      id
      name
    }
  }
}
`
const HASURA_OPERATION_CHANGE_USER_STATUS = `
mutation MyMutation7($email: String!) {
  update_user(where: {email: {_eq: $email}}, _set: {status: 2}) {
    returning {
      id
      lastname
      firstname
    }
  }
}`

// send mail init
const client = Sib.ApiClient.instance;
const apiKey = client.authentications['api-key'];
apiKey.apiKey = process.env.SIB_API_KEY;

const tranEmailApi = new Sib.TransactionalEmailsApi();

module.exports.handler = async (event, context, callback) => {
    // handle input
    const postBody = JSON.parse(event.body);
    const { email, role } = postBody.input;

    let dataGet, name, id;
    let link = 'https://something/';

    if (role === "admin") {
        const { data: dataA, errors: errA } = await execute({ email: email }, { "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET_APP },
            HASURA_OPERATION_CHANGE_ADMIN_STATUS
        );
        if (errA) {
            callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 202, error_code: "ERR_QUERY_FAILED", error_message: "Query failed!", }), });
            return;
        }
        if (dataA.update_admin.length === 0) {
            callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 404, error_code: "ERR_NOT_FOUND", error_message: "Cannot find admin with this email", }), });
            return;
        }
        dataGet = dataA.update_admin.returning[0];
        name = dataGet.name;
        id = dataGet.id;
        link = link + 'admin/';
    }
    if (role === "user") {
        const { data: dataU, errors: errU } = await execute({ email: email }, { "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET_APP },
            HASURA_OPERATION_CHANGE_USER_STATUS
        );
        if (errU) {
            callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 202, error_code: "ERR_QUERY_FAILED", error_message: "Query failed!", }), });
            return;
        }
        if (dataU.update_user.length === 0) {
            callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 404, error_code: "ERR_NOT_FOUND", error_message: "Cannot find admin with this email", }), });
            return;
        }
        dataGet = dataU.update_user.returning[0];
        name = dataGet.firstname + " " + dataGet.lastname;
        id = dataGet.id;
        link = link + 'user/';
    }

    //validate

    const tokenContents = {
        sub: email.toString(),
        id: id,
        email: email,
        iat: Date.now() / 1000,
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    };

    const token = jwt.sign(tokenContents, process.env.JWT_ENCRYPTION_KEY);

    link = link + token;

    //html content
    const htmlContent = `
    <h2>Hi, ${name}!<h2>
    <h3>We have recieve your request to change password</h3>
    <h3>Please join the link below reset your password</h3>
    <div>-----------------------------------------------</div>
    <a href='${link}' target='_blank'>Reset up your pass word here</a>
    <p>${link}</p>
    <div>-----------------------------------------------</div>
    <h3>Thank you for using our services</h3>
    <h3>Plese be careful next time!</h3>
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
            error_message: null
        }),
    };
    return res;
};

const sendMail = async (from, to, content, name) => {
    const msg = {
        sender: from,
        to: to,
        subject: "Reset password request from The Company",
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

