const { Collection } = require('faunadb');
const faunadb = require('faunadb');
const {
    Get,
    Match,
    Index,
    Create,
} = faunadb.query;
const client = new faunadb.Client({
    secret: 'fnAEVEzuNEAASfR97343PAn97eyoRw91WQebzUF4',
    domain: 'db.us.fauna.com',
    scheme: 'https',
})


const getSlugByUrl = (url) => {
    const doc = client.query(
        Get(
            Match(Index("slugs_index_by_url"), url)
        )
    );
    return doc.then(response => 
        response && response.data && response.data.slug || "",
    )
    .catch(e => {return null})
};

const getUrlBySlug = (slug) => {
    const doc = client.query(
        Get(
            Match(Index("slugs_index_by_slug"), slug)
        )
    );
    return doc.then(response => 
        response && response.data && response.data.url || "",
    )
    .catch(e => { return null })
};

const insertNewSlugToDb = (payload) => {
    const doc = client.query(
        Create(
            Collection('slugs'),
            {data: payload}
        )
    );
    return doc.then(response => 
        response
    );
};

const checkIfSlugExists = (slug) => {
    return getUrlBySlug(slug).then(response => {
        if(response){
            return true;
        }
        else{
            return false;
        }
    })
}

const generateNewKey = (counter=0) => {
    let randomKey = (Math.random()+1).toString(36).slice(2,8);

    return checkIfSlugExists(randomKey).then(response => {
        counter += 1;
        if(response) randomKey = generateNewKey(counter);
        else return randomKey;
        return randomKey;
    })

}

const allowCORS = (res) => {
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )
    return res;
}
module.exports = (req, res) => {


    if(req.method === "GET"){
        let requestSlug = req.query.slug;
        
        getUrlBySlug(requestSlug).then(response => {
            let url = response;
            res = allowCORS(res);
            
            res.json({
                "url": url || "",
            }); 
        });
    }
    else if(req.method === "POST"){

        let { url } = req.body;

        try{
            res = allowCORS(res);
            getSlugByUrl(url).then(response => {
                let slug = response;
                if(slug){
                    res.json({
                        "key": response,
                        "url": url || "",
                    }); 
                }
                else{

                    generateNewKey().then(slug => {
                        let data = {
                            "slug": slug,
                            "url": url,
                        };

                        insertNewSlugToDb(data).then(
                            response => {
                                res.json({
                                    "key": slug,
                                    "url": url || "",
                                })
                            }
                        )
                    })

                }
            });
        }
        catch(e){
            res.status(500).json({})
        }
        
    }
    else{
        if (req.method === 'OPTIONS') {
            var headers = {};
            headers["Access-Control-Allow-Origin"] = "*";
            headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
            headers["Access-Control-Allow-Credentials"] = false;
            headers["Access-Control-Max-Age"] = '86400'; // 24 hours
            headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
            res.writeHead(200, headers);
            res.end();
        }
        else {
            res.status(405).json({})
        }
    }


}
