
class Likes_API {
    static Host_URL() { return "http://localhost:5000"; }
    static API_URL() { return this.Host_URL() + "/api/likes" };

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
        console.log(xhr.status);
        this.currentStatus = xhr.status;
        this.error = true;
    }
    static async HEAD() {
        Likes_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL(),
                type: 'HEAD',
                contentType: 'text/plain',
                complete: data => { resolve(data.getResponseHeader('ETag')); },
                error: (xhr) => { Likes_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async Likes(id) {
        return new Promise(resolve => {
            $.ajax({
                url: this.Host_URL() + "/likes/" + id,
                type: "GET",
                complete: (data) => {
                    console.log(data);
                    resolve(data);
                },
                error: (xhr) => {
                    console.log(xhr);
                    Likes_API.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }
    static async LikesOfPost(ids) {
        return new Promise(resolve => {
            $.ajax({
                url: this.Host_URL() + "/likes/likesofpost",
                type: "GET",
                data:{'ids':ids},
                complete: (data) => {
                    resolve(data.responseJSON);
                },
                error: (xhr) => {
                    console.log(xhr);
                    Likes_API.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }
    static async addLike(data) {
        return new Promise(resolve => {
            $.ajax({
                url: this.Host_URL()+ '/likes/postlike',
                type: "POST",
                data:JSON.stringify(data),
                contentType: 'application/json',
                complete: (data) => {
                    resolve({'data':data.responseJSON,'ETag':data.getResponseHeader('ETag')});
                },
                error: (xhr) => {
                    Likes_API.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }
    static async Delete(data) {
        return new Promise(resolve => {
            $.ajax({
                url: this.Host_URL() + "/likes/removelike",
                type: "POST",
                contentType: 'application/json',
                data:JSON.stringify(data),
                complete: (data) => {
                    resolve({'ETag':data.getResponseHeader('ETag')});
                },
                error: (xhr) => {
                    Likes_API.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }
}