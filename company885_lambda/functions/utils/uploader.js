



function extractFile(event) {
    const boundary = parseMultipart.getBoundary(event.headers['content-type'])
    const files = parseMultipart.Parse(Buffer.from(event.body, 'base64'), boundary);
    const [{ filename, data }] = files

    return { filename, data };
}