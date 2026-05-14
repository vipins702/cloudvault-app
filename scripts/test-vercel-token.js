
const token = "vercel_blob_rw_sOOvKg5fhUYifKsP_G9v8BGRKuaTYIDJedh9byLemtRnlkS";
const url = "https://blob.vercel-storage.com?limit=1";

async function test() {
    console.log("Testing token:", token);
    try {
        // Native fetch in Node 18+
        const res = await fetch(url, {
            headers: {
                "Authorization": "Bearer " + token,
                "x-api-version": "1"
            }
        });

        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Body:", text);

    } catch (e) {
        console.error("Error:", e);
    }
}

test();
