const fetch = require("node-fetch");

const ADD_COMMENT = `mutation MyMutation($created_by_admin: Int, $created_by_user: Int, $content: String, $point: Int!, $news_id: Int!) {
  insert_news_comment_one(object: {created_by_admin: $created_by_admin, created_by_user: $created_by_user, content: $content, point: $point, news_id: $news_id}) {
    id
  }
}`

const bad_word = ['terrible', 'horrible', 'bad_word']

module.exports.handler = async (event, context, callback) => {

    const postBody = JSON.parse(event.body);
    const { content, point, created_by_admin, created_by_user, news_id } = postBody.input;

    if (content === '') {
        callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 202, error_code: "ERR_NULL_COMMENT", error_message: "Comment content must not be null", }), });
        return;
    }

    // check
    for (let i = 0; i < bad_word.length; i++) {
        if (content.includes(bad_word[i])) {
            callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 202, error_code: "ERR_BAD_WORD", error_message: "Your comment contains bad word", }), });
            return;
        }
    }


    // insert
    const { data, errors } = await execute({ content: content, point: point, created_by_admin: created_by_admin, created_by_user: created_by_user, news_id: news_id }, { "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET_APP }, ADD_COMMENT);

    if (errors) {
        callback(null, { statusCode: 202, body: JSON.stringify({ status_code: 202, error_code: "ERR_QUERY_FAILED", error_message: "Query failed!", }), });
        return;
    }

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

