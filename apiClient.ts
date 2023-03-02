import https from 'https';
import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';

class apiClient
{
    serverUrl: string;
    path: string;
    timeout: number;
    rejectUnauthorized: boolean;
    method: string;
    data: string;
    instance: AxiosInstance;

    constructor(serverUrl: string, rejectUnauthorized: boolean) {
        this.serverUrl = serverUrl;
        this.path = "";
        this.timeout = 5;
        this.rejectUnauthorized = rejectUnauthorized;
        this.method = "";
        this.data = "";
        this.instance = axios.create({
            httpsAgent: new https.Agent({  
                rejectUnauthorized: this.rejectUnauthorized
            })
        });
        axiosRetry(this.instance, { retries: Infinity, retryDelay: (retryCount) => { return 5000; }});
    }

    public async serverIsAlive(){
        try{
            const response = await this.instance({
                method: "get",
                url: this.serverUrl,
                data: "",
                timeout: this.timeout * 1000,
            })
            return true;
        }
        catch (error) {
            //console.error(error);
            return false;
          }
    }

    public async getApiKey (user: string, pass: string) {
        try{
            this.path = "/zm/api/host/login.json";
            this.data = "user=" + user + "&pass=" + pass + "&stateful=1";
            let fullURL = this.serverUrl + this.path;

            const response = await this.instance({
                method: "post",
                url: fullURL,
                data: this.data,
                timeout: this.timeout * 1000,
            })
            return JSON.stringify(response.data);
        }
        catch (error) {
            console.error(error);
            return JSON.stringify('{"access_token": "", "access_token_expires" : 0, "refresh_token" : "", "refresh_token_expires": 0}');
          }
    }

    public async getNewAccessToken (refreshToken: string) {
        try {
            this.path = "/zm/api/host/login.json?token=" + refreshToken;
            let fullURL = this.serverUrl + this.path;

            const response = await this.instance({
                method: "get",
                url: fullURL,
                timeout: this.timeout * 1000,
            })
            
            return JSON.stringify(response.data);
        }
        catch (error){
            console.error(error);
            return JSON.stringify('{"access_token": "", "access_token_expires" : 0}');
        }
        
    }
}

export { apiClient }