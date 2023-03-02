class apiKey
{
    access_token: string = "";
    access_token_expires: number = 0;
    refresh_token: string = "";
    refresh_token_expires: number = 0;
    callback: () => void;
    token_expires_margin: number = 600;

    constructor(apiKey: string, callback: () => void) {
        this.callback = callback;
        try {
            let apiKeyJson =  JSON.parse(apiKey);
            this.access_token = apiKeyJson.access_token;
            this.access_token_expires = (apiKeyJson.access_token_expires > this.token_expires_margin ? apiKeyJson.access_token_expires - this.token_expires_margin : 0) ;
            this.refresh_token = apiKeyJson.refresh_token;
            this.refresh_token_expires = (apiKeyJson.refresh_token_expires > this.token_expires_margin ? apiKeyJson.refresh_token_expires - this.token_expires_margin : 0);
        }
        catch(error) {
            console.error(error);
        }
    }

    static empty() {
        return new apiKey('{"access_token": "", "access_token_expires" : 0, "refresh_token" : "", "refresh_token_expires": 0}', function(){
            console.log("Create an empty apiKey set");
        });
    }

    public toString = () : string => {
        return '{"access_token": ' + this.access_token + ', "access_token_expires" : ' + this.access_token_expires + 
                ', "refresh_token" : ' + this.refresh_token + ', "refresh_token_expires": ' + this.refresh_token_expires + '}';
    }

    public resetTokenExpiration(){
        this.access_token_expires = 0;
        this.refresh_token_expires = 0;
    }

    public refreshToken(apiKey: string){
        try {
            let apiKeyJson =  JSON.parse(apiKey);
            this.access_token = apiKeyJson.access_token;
            this.access_token_expires = apiKeyJson.access_token_expires - this.token_expires_margin;
        }
        catch (error){
            console.error(error);
        }
    }
}

export { apiKey }