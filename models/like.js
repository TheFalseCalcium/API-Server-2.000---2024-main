import Model from './model.js';

export default class Like extends Model {
    constructor() {
        super(true);
        this.addField('Post', 'string');
        this.addField('User', 'string');
        this.addField('Id','string');

        this.setKey('Id');
        

    }
}