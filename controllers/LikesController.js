import LikeModel from '../models/like.js';
import Repository from '../models/repository.js';
import Controller from './Controller.js';
import AccessControl from '../accessControl.js';
import AccountsController from './AccountsController.js';



export default class LikesController extends Controller {
    constructor(HttpContext) {
        super(HttpContext, new Repository(new LikeModel()), AccessControl.user());
    }
    postlike(data) {
        if (AccessControl.writeGranted(this.HttpContext.authorizations, this.requiredAuthorizations)) {
            let alreadyLiked = this.repository.findByFilter(function (obj) { return (obj.Post == data.Post && obj.User == data.User) });
            if (alreadyLiked.length > 0) {
                this.HttpContext.response.conflict('Already Liked');
            } else {
                data = this.repository.add(data);
                if (this.repository.model.state.isValid) {
                    this.HttpContext.response.JSON(data,this.repository.ETag);
                } else {
                    if (this.repository.model.state.inConflict)
                        this.HttpContext.response.conflict(this.repository.model.state.errors);
                    else
                        this.HttpContext.response.badRequest(this.repository.model.state.errors);
                }
            }
        } else
            this.HttpContext.response.unAuthorized("Unauthorized access");
    }
    removelike(data) {
        if (AccessControl.writeGranted(this.HttpContext.authorizations, this.requiredAuthorizations)) {
            if (data) {
                let alreadyLiked = this.repository.findByFilter(function (obj) { return (obj.Post == data.Post && obj.User == data.User) });
                if (alreadyLiked.length > 0 ){
                    if(this.repository.remove(alreadyLiked[0].Id)){
                        this.HttpContext.response.JSON({'giveEtag':0},this.repository.ETag);
                    }
                    else
                        this.HttpContext.response.notFound("Ressource not found.");
                }
                else
                    this.HttpContext.response.notFound("Ressource not found.");
            } else
                this.HttpContext.response.badRequest("Data is unprocessable");
        } else
            this.HttpContext.response.unAuthorized("Unauthorized access");
    }
    likes(id) {
        if (id != '') {
            if (AccessControl.readGranted(this.HttpContext.authorizations, AccessControl.user())) {
                let _AccountController = new AccountsController(this.HttpContext);

                let users = this.repository.findByFilter(function (obj) { return obj.Post == id });
                users = _AccountController.repository.findByFilter(function (obj) { return users.indexOf(obj.Id) > 0 });

                this.HttpContext.response.JSON({ "users": users, "likes": users.length });
            }
            else {
                this.HttpContext.response.unAuthorized("Unauthorized access");
            }
        }
        else {
            this.HttpContext.response.notFound();
        }
    }
    likesofpost() {
        if (this.HttpContext.path.params['ids[]'] != undefined) {
            if (AccessControl.readGranted(this.HttpContext.authorizations, AccessControl.user())) {
                let ids = this.HttpContext.path.params['ids[]'];

                let _AccountController = new AccountsController(this.HttpContext);
                let likesByPost = [];
                let likes;
                if(!Array.isArray(ids)){
                    var temp_var=ids;
                    ids=new Array();
                    ids.push(temp_var);
                }
                for (let i = 0; i < ids.length; i++) {
                    likes = this.repository.findByFilter(function (obj) { return obj.Post == ids[i] });
                    let likesId = likes.map(obj => obj.User);
                    if (likes != undefined && likes.length > 0) {
                        let foundUsers = _AccountController.repository.findByFilter(function (obj) { return likesId.indexOf(obj.Id) > -1 });
                        likesByPost.push({ "users": foundUsers, "likes": likes.length });
                    } else {
                        likesByPost.push({ "users": [], "likes": 0 });
                    }
                }
                this.HttpContext.response.JSON(likesByPost);
            }
            else {
                this.HttpContext.response.unAuthorized("Unauthorized access");
            }
        }
        else {
            this.HttpContext.response.badRequest();
        }
    }
}
