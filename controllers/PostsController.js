import PostModel from '../models/post.js';
import Repository from '../models/repository.js';
import Controller from './Controller.js';
import LikesController from './LikesController.js';
import AccessControl from '../accessControl.js';

export default class PostModelsController extends Controller {
    constructor(HttpContext) {
        super(HttpContext, new Repository(new PostModel()));
    }
    remove(id){
        if (AccessControl.writeGrantedAdminOrOwner(this.HttpContext, this.requiredAuthorizations, id)) {

            let _LikeController=new LikesController(this.HttpContext);
            // remove likes of Post
            _LikeController.repository.keepByFilter(function(obj){return obj.Post != id });
            
            //delete post
            var isDeleted = this.repository.remove(id);

            if(isDeleted != true){
                this.HttpContext.response.notFound('Post not found');
            }else{
                this.HttpContext.response.accepted();
            }
            // todo
        }else{
            this.HttpContext.response.unAuthorized('unAuthorized');
        }
    }
}

