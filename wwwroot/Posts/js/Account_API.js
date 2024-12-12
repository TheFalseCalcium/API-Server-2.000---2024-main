
class Account_API {
    static API_URL() { return window.location.origin+"/accounts" };
    static initHttpState() {
        this.currentHttpError = "";
        this.currentStatus = 0;
        this.error = false;
    }
    static setHttpErrorState(xhr) {
        if (xhr.responseJSON)
            this.currentHttpError = xhr.responseJSON.error_description;
        else
            this.currentHttpError = xhr.statusText == 'error' ? "Service introuvable" : xhr.statusText;
        this.currentStatus = xhr.status;
        this.error = true;
    }
    static async HEAD() {
        Account_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + '/head',
                type: 'HEAD',
                contentType: 'text/plain',
                complete: data => { resolve(data.getResponseHeader('ETag')); },
                error: (xhr) => { Account_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async Get(id=null) {
        Account_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: window.location.origin+'/api/accounts' + (id != null ? "/" + id : ""),
                type:'GET',
                complete: data => { resolve({ ETag: data.getResponseHeader('ETag'), data: data.responseJSON }); },
                error: (xhr) => { Likes_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async GetUsers(ids) {
        Account_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: window.location.origin+'/accounts/getusers',
                type:'GET',
                data:{'ids':ids},
                complete:data=>{
                    resolve(data.responseJSON);
                },
                //complete: data => { resolve({ ETag: data.getResponseHeader('ETag'), data: data.responseJSON }); },
                error: (xhr) => { Likes_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async Login(email,password) {
        Account_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: window.location.origin+'/token',
                type: "Post",
                contentType: 'application/json',
                data:JSON.stringify({'Email':email, 'Password': password}),
                complete: (data) => {
                    resolve({'responseJSON':data.responseJSON,'status':data.status});
                },
                error: (xhr) => {
                   Account_API.setHttpErrorState(xhr); resolve({'responseJSON':xhr.responseJSON,'status':xhr.status});
                }
            });
        });
    }
    static async Register(data) {
        Account_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + '/register',
                type: "POST",
                contentType: 'application/json',
                data:JSON.stringify(data),
                complete: (data) => {
                    
                    resolve(data);
                },
                error: (xhr) => {
                    Account_API.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }
    static async Verify(id,code) {
        Account_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + '/verify',
                type: "GET",
                contentType: 'application/json',
                data:{'id':id,'code':code},
                complete: (data) => {
                    
                    resolve(data);
                },
                error: (xhr) => {
                    console.log('grr');
                    console.log(xhr.status);
                    if(xhr.status == 480){
                        resolve({'status':480});
                    }else{
                        Account_API.setHttpErrorState(xhr);
                        resolve(null);
                    }
                }
            });
        });
    }
    static async Modify(data) {
        Account_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + '/modify',
                type: "PUT",
                contentType: 'application/json',
                data:JSON.stringify(data),
                complete: (data) => {
                    resolve(data);
                },
                error: (xhr) => {
                    Account_API.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }
    static async Delete(id) {
        Account_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + '/remove/' + id,
                type: "GET",
                contentType: 'application/json',
                complete: (data) => {

                    resolve(true);
                },
                error: (xhr) => {
                    Account_API.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }
    static async Logout(id) {
        Account_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + '/logout',
                type: "GET",
                contentType: 'application/json',
                data:{'userId':id},
                complete: (data) => {
                    if(data.status == 200){
                        resolve(true);
                    }
                },
                error: (xhr) => {
                    if(xhr.status == 400){
                        Account_API.setHttpErrorState(xhr); resolve(null);
                    }else{
                        Account_API.setHttpErrorState(xhr);
                        resolve(null);
                    } 
                }
            });
        });
    }
    static GetQuery(queryString="") {
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + queryString,
                type: "GET",
                complete: (data) => {
                    Account_API.initHttpState();
                    resolve(data);
                },
                error: (xhr) => {
                    Account_API.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }
    static promote(user) {
        Account_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + '/promote',
                type: "POST",
                data:JSON.stringify(user),
                contentType: 'application/json',
                complete: (data) => {
                    resolve(data);
                },
                error: (xhr) => {
                    Account_API.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }
    static block(user) {
        Account_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + '/block',
                type: "POST",
                data:JSON.stringify(user),
                contentType: 'application/json',
                complete: (data) => {
                    resolve(data);
                },
                error: (xhr) => {
                    Account_API.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }
    static checkToken(accesToken) {
        Account_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + '/checktoken',
                type: "Get",
                data:{'token':accesToken},
                contentType: 'application/json',
                complete: (data) => {
                    resolve(data);
                },
                error: (xhr) => {
                    Account_API.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }
}