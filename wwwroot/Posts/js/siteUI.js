////// Author: Nicolas Chourot
////// 2024
//////////////////////////////

//import queryString from "query-string";

const periodicRefreshPeriod = 2;
const waitingGifTrigger = 2000;
const minKeywordLenth = 3;
const keywordsOnchangeDelay = 500;
const sessionTimeout = 300;

let categories = [];
let selectedCategory = "";
let currentETag = "";
let currentETagLikes = "";
let currentETagUsers = "";
let currentPostsCount = -1;
let periodic_Refresh_paused = false;
let resfreshTimeout;
let postsPanel;
let itemLayout;
let waiting = null;
let showKeywords = false;
let keywordsOnchangeTimger = null;
let connectedUser = false;
let AccesToken = null;
let resetShowKeywords = false;

async function checkToken() {
    if (sessionStorage.getItem('token') != undefined) {
        let res = await Account_API.checkToken(sessionStorage.getItem('token'));
        if (res != null) {
            connectedUser = res.User;
            
            sessionStorage.setItem('token', res.Access_token);


            await $.ajaxSetup({
                headers: {
                    'authorization': `${res.Access_token}`
                },
            });
            install_timeout();
            updateDropDownMenu();
            intialView();
        }
    }
    Init_UI();
}

checkToken();



async function Init_UI() {
    postsPanel = new PageManager('postsScrollPanel', 'postsPanel', 'postSample', renderPosts);
    $('#createPost').on("click", async function () {
        showCreatePostForm();
    });
    $('#abort').on("click", async function () {
        showPosts();
        updateDropDownMenu();
    });
    $('#aboutCmd').on("click", function () {
        showAbout();
    });
    $("#showSearch").on('click', function () {
        toogleShowKeywords();
        showPosts();
    });

    installKeywordsOnkeyupEvent();
    await showPosts();
    start_Periodic_Refresh();
}

/////////////////////////// Search keywords UI //////////////////////////////////////////////////////////

function installKeywordsOnkeyupEvent() {

    $("#searchKeys").on('keyup', function () {
        clearTimeout(keywordsOnchangeTimger);
        keywordsOnchangeTimger = setTimeout(() => {
            cleanSearchKeywords();
            showPosts(true);
        }, keywordsOnchangeDelay);
    });
    $("#searchKeys").on('search', function () {
        showPosts(true);
    });
}
function cleanSearchKeywords() {
    /* Keep only keywords of 3 characters or more */
    let keywords = $("#searchKeys").val().trim().split(' ');
    let cleanedKeywords = "";
    keywords.forEach(keyword => {
        if (keyword.length >= minKeywordLenth) cleanedKeywords += keyword + " ";
    });
    $("#searchKeys").val(cleanedKeywords.trim());
}
function showSearchIcon() {
    $("#hiddenIcon").hide();
    $("#showSearch").show();
    if (showKeywords) {
        $("#searchKeys").show();
    }
    else
        $("#searchKeys").hide();
}
function hideSearchIcon() {
    $("#hiddenIcon").show();
    $("#showSearch").hide();
    $("#searchKeys").hide();
}
async function toogleShowKeywords() {
    showKeywords = !showKeywords;
    if (showKeywords) {
        $("#searchKeys").show();
        $("#searchKeys").focus();
    }
    else {
        $("#searchKeys").hide();
        $('#searchKeys').val('');
        resetShowKeywords = true;
    }
}

/////////////////////////// Views management ////////////////////////////////////////////////////////////

function intialView() {
    $("#hiddenIcon").hide();
    $("#hiddenIcon2").hide();
    $('#menu').show();
    $('#commit').hide();
    $('#abort').hide();
    $('#form').hide();
    $('#form').empty();
    $('#aboutContainer').hide();
    $('#errorContainer').hide();
    showSearchIcon();
    if (connectedUser != false) {
        if (!isAdmin() && isSuperUser()) {
            $("#createPost").show();
        } else {
            $('#hiddenIcon').show();
            $("#createPost").hide();
        }

    } else {
        $("#createPost").hide();
        $('#hiddenIcon').show();
    }
}
async function showPosts(reset = false) {
    periodic_Refresh_paused = true;
    intialView();
    $("#viewTitle").text("Fil de nouvelles");
    await postsPanel.show(reset);
    periodic_Refresh_paused = false;
}
function hidePosts() {
    postsPanel.hide();
    hideSearchIcon();
    $("#createPost").hide();
    $('#menu').hide();
    periodic_Refresh_paused = true;
}
function showForm() {
    hidePosts();
    $('#form').show();
    $('#commit').show();
    $('#abort').show();
}
function showConnexion() {
    showForm();
    $('#commit').hide();
    $('#hiddenIcon2').show();
}
function showError(message, details = "") {
    hidePosts();
    $('#form').hide();
    $('#form').empty();
    $("#hiddenIcon").show();
    $("#hiddenIcon2").show();
    $('#commit').hide();
    $('#abort').show();
    $("#viewTitle").text("Erreur du serveur...");
    $("#errorContainer").show();
    $("#errorContainer").empty();
    $("#errorContainer").append($(`<div>${message}</div>`));
    $("#errorContainer").append($(`<div>${details}</div>`));
    $("#errorContainer").show();
}
function showCreatePostForm() {
    showForm();
    $("#viewTitle").text("Ajout de nouvelle");
    renderPostForm();
}
function showEditPostForm(id) {
    showForm();
    $("#viewTitle").text("Modification");
    renderEditPostForm(id);
}
function showDeletePostForm(id) {
    showForm();
    $("#viewTitle").text("Retrait");
    renderDeletePostForm(id);
}
function showAbout() {
    hidePosts();
    $("#hiddenIcon").show();
    $("#hiddenIcon2").show();
    $('#abort').show();
    $("#viewTitle").text("À propos...");
    $("#aboutContainer").show();
}

//////////////////////////// Posts rendering /////////////////////////////////////////////////////////////

function delay_periodic_refresh() {
    periodic_Refresh_paused = true;
    clearTimeout(resfreshTimeout);
    resfreshTimeout = setTimeout(() => { periodic_Refresh_paused = false; }, 1000);
}
function start_Periodic_Refresh() {
    $("#reloadPosts").addClass('white');
    $("#reloadPosts").on('click', async function () {
        $("#reloadPosts").addClass('white');
        postsPanel.resetScrollPosition();
        await showPosts();
    });

    setInterval(async () => {
        if (!periodic_Refresh_paused) {
            let etag = await Posts_API.HEAD();
            let usersEtag = await Account_API.HEAD();
            let likesEtag = "";
            if (connectedUser != false) {
                likesEtag = await Likes_API.HEAD();
            }
            if (etag == null) {
                showError("Une erreur est survenue! " + Posts_API.currentHttpError);
            } else if (usersEtag == null) {
                showError("Une erreur est survenue! " + Account_API.currentHttpError);
            } else if (likesEtag == null) {
                showError("Une erreur est survenue! " + Likes_API.currentHttpError);
            }
            // the etag contain the number of model records in the following form
            // xxx-etag
            let postsCount = parseInt(etag.split("-")[0]);
            if (currentETag != etag || ((currentETagLikes != likesEtag && likesEtag != "") && connectedUser != false) || (currentETagUsers != usersEtag && usersEtag != "")) {
                if (postsCount != currentPostsCount) {
                    console.log("postsCount", postsCount)
                    currentPostsCount = postsCount;

                    $("#reloadPosts").removeClass('white');
                } else {
                    await showPosts();
                }
                currentETagLikes = likesEtag;
                currentETagUsers = usersEtag;
                currentETag = etag;
            }
        }
    },
        periodicRefreshPeriod * 1000);
}
async function renderPosts(queryString) {
    let endOfData = false;

    queryString += "&sort=date,desc";
    compileCategories();
    if (selectedCategory != "") queryString += "&category=" + selectedCategory;
    if (showKeywords) {
        let keys = $("#searchKeys").val().replace(/[ ]/g, ',');

        if (keys !== "")
            queryString += "&keywords=" + $("#searchKeys").val().replace(/[ ]/g, ',')
    }
    if (resetShowKeywords) {
        resetShowKeywords = false;
        $('#postspanel').empty();

    }

    if (connectedUser != false) {
        if (connectedUser.isBlocked == true) {
            disconnect();
        }
    }
    addWaitingGif();
    let response = await Posts_API.GetQuery(queryString);
    if (!Posts_API.error) {
        currentETag = response.ETag;
        currentPostsCount = parseInt(currentETag.split("-")[0]);
        let Posts = response.data;
        let PostsIds = [];
        let usersIds = [];
        if (connectedUser != false) {

            Posts.forEach(Post => {
                PostsIds.push(Post.Id);
                usersIds.push(Post.OwnerId);
            })
            if (Posts.length > 0) {
                let likes = await Likes_API.LikesOfPost(PostsIds);
                if (likes == null) {
                    console.log(Likes_API.currentHttpStatus);
                    if (Likes_API.currentStatus == 401) {
                        disconnect(false);
                        showError("Vous n'êtes pas autorisé. " + Account_API.currentHttpError);
                    }
                } else {
                    let users = await Account_API.GetUsers(usersIds);

                    if (users == null) {
                        showError("Une erreur est survenue! " + Account_API.currentHttpError);
                    } else {
                        Posts.forEach((Post, i) => {
                            postsPanel.append(renderPost(Post, likes[i], users[i]));
                        });
                    }
                }

            } else
                endOfData = true;
        } else {
            let usersIds = [];
            Posts.forEach((Post) => {
                usersIds.push(Post.OwnerId);
            });
            if (Posts.length > 0) {
                let users = await Account_API.GetUsers(usersIds);

                if (users == null) {
                    showError("Une erreur est survenue! " + Account_API.currentHttpError);
                } else {
                    Posts.forEach((Post, i) => {
                        postsPanel.append(renderPost(Post, undefined, users[i]));
                    });
                }
            }
        }
        linefeeds_to_Html_br(".postText");
        highlightKeywords();
        attach_Posts_UI_Events_Callback();
    } else {
        showError("Une erreur est survenue! " + Account_API.currentHttpError);
    }
    removeWaitingGif();
    return endOfData;
}
function renderPost(post, likes, owner) {
    let date = convertToFrenchDate(UTC_To_Local(post.Date));
    let isOwnerIconClass = "";
    let isAdminOwnerIconClass= "";
    let likesHtml = "";
    let tooltip = "";
    let hasLiked = false;
    if (connectedUser != false) {
        if (likes != undefined) {
            likes.users.forEach(user => {
                if (user.Id == connectedUser.Id) {
                    hasLiked = true;
                    tooltip += 'Vous';
                } else {
                    tooltip += user.Name;
                }
                tooltip += '\n';
            });
            likesHtml = likesHtml + `<i class="${e = hasLiked ? "fa-solid removeLike" : "fa-regular addLike"} Cmd cmdIconSmall likeCmd fa-thumbs-up" title="Ajouter/Enlever un like"  postId="${post.Id}"></i>` +
                `<span class="cmdIconSmall likeCmd Cmd" title="${tooltip}">${e = likes == undefined ? '' : likes.likes}</span>`;
        }
        isOwnerIconClass = (post.OwnerId == connectedUser.Id || isAdmin()) ? "hoverCmd" : "hoverHidden";
        isAdminOwnerIconClass = isAdmin() == true? "hoverHidden": isOwnerIconClass;

    }

    let crudIcon =
        `
        <span class="editCmd Cmd cmdIconSmall fa fa-pencil ${isAdminOwnerIconClass}" postId="${post.Id}" title="Modifier nouvelle"></span>
        <span class="deleteCmd Cmd cmdIconSmall fa fa-trash ${isOwnerIconClass}" postId="${post.Id}" title="Effacer nouvelle"></span>
        ${likesHtml}
        `;


    return $(`
        <div class="post" id="${post.Id}">
            <div class="postHeader">
                ${post.Category}
                ${crudIcon}
            </div>
            <div class="postTitle"> ${post.Title} </div>
            <img class="postImage" src='${post.Image}'/>
            <div class="post-info-container">
                <div class="post-owner-container">
                    <img src="${owner.Avatar}">
                    <div>${(owner.Name).substring(0, 20)}</div>
                </div>
                <div class="postDate"> ${date} </div>
                
            </div>
            
            <div postId="${post.Id}" class="postTextContainer hideExtra">
                <div class="postText" >${post.Text}</div>
            </div>
            <div class="postfooter">
                <span postId="${post.Id}" class="moreText cmdIconXSmall fa fa-angle-double-down" title="Afficher la suite"></span>
                <span postId="${post.Id}" class="lessText cmdIconXSmall fa fa-angle-double-up" title="Réduire..."></span>
            </div>         
        </div>
    `);
}
async function compileCategories() {
    categories = [];
    let response = await Posts_API.GetQuery("?fields=category&sort=category");
    if (!Posts_API.error) {
        let items = response.data;
        if (items != null) {
            items.forEach(item => {
                if (!categories.includes(item.Category))
                    categories.push(item.Category);
            })
            if (!categories.includes(selectedCategory))
                selectedCategory = "";
            updateDropDownMenu(categories);
        }
    }
}
function updateDropDownMenu() {
    let DDMenu = $("#DDMenu");
    let selectClass = selectedCategory === "" ? "fa-check" : "fa-fw";
    DDMenu.empty();
    if (!connectedUser) {

        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout" id="connectCmd">
                <i class="menuIcon fa fa-arrow-right-to-bracket mx-2"></i> Connexion
            </div>
            `));
    } else {
        DDMenu.append($(`
            <div class="dropdown-item avatarItemLayout">
                <img src="${connectedUser.Avatar}">
                <div>${connectedUser.Name}</div>
            </div>
            `));
        DDMenu.append($(`<div class="dropdown-divider"></div>`));
        if (connectedUser.Authorizations.readAccess == 3 && connectedUser.Authorizations.writeAccess == 3) {
            DDMenu.append($(`
                <div class="dropdown-item menuItemLayout" id="adminCmd">
                    <i class="menuIcon fa-solid fa-user-gear"></i>Gestion des usagers
                </div>
                `));
            DDMenu.append($(`<div class="dropdown-divider"></div>`));
        }
        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout" id="editCmd">
                <i class="menuIcon fa fa-user-pen mx-2"></i> Modifier votre profile
            </div>
            `));
        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout" id="disconnectCmd">
                <i class="menuIcon fa fa-arrow-right-to-bracket mx-2"></i> Déconnexion
            </div>
            `));
    }
    DDMenu.append($(`<div class="dropdown-divider"></div>`));
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="allCatCmd">
            <i class="menuIcon fa ${selectClass} mx-2"></i> Toutes les catégories
        </div>
        `));
    DDMenu.append($(`<div class="dropdown-divider"></div>`));
    categories.forEach(category => {
        selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout category" id="allCatCmd">
                <i class="menuIcon fa ${selectClass} mx-2"></i> ${category}
            </div>
        `));
    });
    DDMenu.append($(`<div class="dropdown-divider"></div> `));
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="aboutCmd">
            <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
        </div>
        `));
    $('#aboutCmd').on("click", function () {
        showAbout();
    });
    $('#allCatCmd').on("click", async function () {
        selectedCategory = "";
        await showPosts(true);
        updateDropDownMenu();
    });
    $('.category').on("click", async function () {
        selectedCategory = $(this).text().trim();
        await showPosts(true);
        updateDropDownMenu();
    });
    $('#connectCmd').on("click", function () {
        renderLogin();
    });
    $('#disconnectCmd').on("click", function () {
        disconnect();
    });
    $('#editCmd').on("click", function () {
        renderRegisterPage(connectedUser);
    });
    $('#adminCmd').on("click", function () {
        renderAdminPage();
    });
}
async function addLike(node) {
    node.off();
    postId = node.attr('postId');
    let res = await Likes_API.addLike({ "Post": postId, 'User': connectedUser.Id });
    if (res != null) {
        currentETagLikes = res.ETag;
        await showPosts();
    } else {
        showError("Une erreur est survenue! " + Account_API.currentHttpError);
    }

    // delay_periodic_refresh();

    // node.removeClass('fa-regular addLike').addClass('fa-solid removeLike');
    // node.next().text(parseInt(node.next().text()) + 1);
    // node.next().prop('title', 'Vous\n' + node.next().prop('title'));


    // node.on('click', function () {
    //     removeLike(node);
    // });
}
async function removeLike(node) {
    node.off();
    postId = node.attr('postId');
    let res = await Likes_API.Delete({ "Post": postId, 'User': connectedUser.Id });
    if (res != null) {
        currentETagLikes = res.ETag;
        await showPosts();
    } else {
        showError("Une erreur est survenue! " + Account_API.currentHttpError);
    }
    await showPosts();
    // delay_periodic_refresh();

    // node.removeClass('fa-solid removeLike').addClass('fa-regular addLike');
    // node.next().text(parseInt(node.next().text()) - 1);
    // node.next().prop('title', (node.next().prop('title').replace('Vous', '')).replace(/^\s*$(?:\r\n?|\n)/gm, ''));


    // node.on('click', function () {
    //     addLike(node);
    // });
}
function attach_Posts_UI_Events_Callback() {

    linefeeds_to_Html_br(".postText");
    // attach icon command click event callback
    $(".editCmd").off();
    $(".editCmd").on("click", function () {
        showEditPostForm($(this).attr("postId"));
    });
    $(".deleteCmd").off();
    $(".deleteCmd").on("click", function () {
        showDeletePostForm($(this).attr("postId"));
    });
    $(".moreText").off();
    $(".moreText").click(function () {
        $(`.commentsPanel[postId=${$(this).attr("postId")}]`).show();
        $(`.lessText[postId=${$(this).attr("postId")}]`).show();
        $(this).hide();
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).addClass('showExtra');
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).removeClass('hideExtra');
    })
    $(".lessText").off();
    $(".lessText").click(function () {
        $(`.commentsPanel[postId=${$(this).attr("postId")}]`).hide();
        $(`.moreText[postId=${$(this).attr("postId")}]`).show();
        $(this).hide();
        postsPanel.scrollToElem($(this).attr("postId"));
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).addClass('hideExtra');
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).removeClass('showExtra');
    });
    $('.likeCmd').off();
    $('.addLike').off();
    $('.removeLike').off();

    if (connectedUser != false) {
        $('.addLike').on('click', function () {

            addLike($(this));

            // postId = $(this).attr('postId');
            // await Likes_API.addLike({ "Post": postId, 'User': connectedUser.Id });
            // $(this).removeClass('fa-regular addLike').addClass('fa-solid removeLike');

            //await showPosts();
        });
        $('.removeLike').on('click', function () {

            removeLike($(this));

            // postId=$(this).attr('postId');
            // await Likes_API.Delete({"Post":postId,'User':connectedUser.Id});
            //    $(this).removeClass('fa-solid removeLike').addClass('fa-regular addLike');

            //await showPosts();
        });
    }
}
function addWaitingGif() {
    clearTimeout(waiting);
    waiting = setTimeout(() => {
        postsPanel.itemsPanel.append($("<div id='waitingGif' class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>'"));
    }, waitingGifTrigger)
}
function removeWaitingGif() {
    clearTimeout(waiting);
    $("#waitingGif").remove();
}
/////////////////////// Connexion UI ///////////////////////////////////////////////////////
let regexEmail = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;

function renderLoginMessage(message) {
    $('#form').empty();
    $('#form').append(`
        <form class="form form-connect flex-column">
            <div id="text" class="space-bottom">${message}</div>
            <div class="space-bottom">
                <input type="text" placeholder="Email" required id="email" >
                <span style="display:none;" class="error"><i></i></span>
            </div>
            
            <div class="space-bottom">
                <input type="password" placeholder="Mot de passe" required id="password">
                <span style="display:none;" class="error"><i></i></span>
            </div>

            <button class="blue" >Entrer</button>
        </form>        
        `);

    showConnexion();
    $("#viewTitle").text("Connexion");
    // connexion
    $('form').on('submit', async function (e) {
        e.preventDefault();
        connexionClearErrors();
        let email = $('#email').val();
        let password = $('#password').val();

        if (!(email.trim() == "" && password.trim() == "")) {
            let res = await Account_API.Login(email.trim(), password.trim());
            if (res.status != 201) {
                if (res.status == 481) {
                    $('#email + span').text('Courriel introuvable').show();
                }
                if (res.status == 482) {
                    $('#password + span').text('Mot de passe incorrect').show();
                }
                if (res.status == 483) {
                    $('#email + span').text('Vous avez été bloqué par un admin').show();
                }
            } else
                if (res.status === 201) {
                    connectedUser = res.responseJSON.User;
                    AccesToken = res.responseJSON.Access_token;
                    sessionStorage.setItem('token', AccesToken);
                    install_timeout();
                    $.ajaxSetup({
                        headers: {
                            'authorization': `${AccesToken}`
                        },
                    });
                    showPosts();
                    updateDropDownMenu();
                } else {
                    showError("Une erreur est survenue! " + Account_API.currentHttpError);
                }
        }
    });
}
function renderMailCode() {
    let connectedUserId = connectedUser.Id;
    connectedUser = false;
    $('#form').empty();
    $('#form').append(`
        <form class="form form-connect flex-column">
            <div id="text" class="space-bottom">Veuiller entre le code de vérification que vous avez reçu par courriel</div>
            
            <div class="space-bottom">
                <input type="text" placeholder="Code de vérification de courriel" id="code" required>
                <span style="display:none;" class="error"><i></i></span>
            </div>
            <button class="blue" type="submit">Vérifier</button>
        </form>        
        `);
    showConnexion();
    $("#viewTitle").text("Connexion");

    $('#form').find('form').on('submit', async function (e) {
        e.preventDefault();
        connexionClearErrors();
        let res = await Account_API.Verify(connectedUserId, $('#code').val());


        if (res.status == undefined) {
            connectedUser = res;
            console.log(connectedUser);
            sessionStorage.setItem('token', AccesToken);
            install_timeout();
            $.ajaxSetup({
                headers: {
                    'authorization': `${AccesToken}`
                },
            });
            showPosts();
            updateDropDownMenu();
        } else if (res.status == 480) {
            $('#code + span').text("Code de vérification incorrect").show();
        } else {
            showError("Une erreur est survenue! " + Account_API.currentHttpError);
        }

    });
}
function connexionClearErrors() {
    $('form').find('.error').hide();
}
function renderLogin(message = "") {

    let text = message == "" ? message : `<div id="text" class="redText space-bottom">${message}</div>`;
    $('#form').empty();
    $('#form').append(`
        <form class="form form-connect flex-column">
            ${text}
            <div class="space-bottom">
                <input type="text" placeholder="Email" id="email" required>
                <span style="display:none;" class="error"><i></i></span>
            </div>
            <div class="space-bottom">
                <input type="password" placeholder="Mot de passe" id="password" required>
                <span style="display:none;" class="error">Allo</span>
            </div>
            <button class="blue" type="submit" >Entrer</button>
            <hr>
            <button class="light-blue">Nouveau Compte</button>
        </form>        
        `);


    showConnexion();
    $("#viewTitle").text("Connexion");

    // connexion
    $('#form').find('form').on('submit', async function (e) {
        e.preventDefault();
        connexionClearErrors();
        //console.log($("#password").val().trim()=="");
        let email = $('#email').val();
        let password = $('#password').val();

        if (!(email.trim() == "" && password.trim() == "")) {
            let res = await Account_API.Login(email.trim(), password.trim());
            if (res.status != 201) {
                if (res.status == 481) {
                    $('#email + span').text('Courriel introuvable').show();
                }
                if (res.status == 482) {
                    $('#password + span').text('Mot de passe incorrect').show();
                }
                if (res.status == 483) {
                    $('#email + span').text('Vous avez été bloqué par un admin').show();
                }
            } else
                if (res.status === 201) {
                    if (res.responseJSON.User.VerifyCode != "verified") {
                        connectedUser = res.responseJSON.User;
                        connectedUser.password = password.trim();
                        AccesToken = res.responseJSON.Access_token;

                        renderMailCode();

                    } else {
                        connectedUser = res.responseJSON.User;
                        AccesToken = res.responseJSON.Access_token;
                        sessionStorage.setItem('token', AccesToken);
                        install_timeout();
                        $.ajaxSetup({
                            headers: {
                                'authorization': `${AccesToken}`
                            },
                        });
                        showPosts();
                        updateDropDownMenu();
                    }
                } else {
                    showError("Une erreur est survenue! " + Account_API.currentHttpError);
                }
            console.log(connectedUser);
        }
    });
    // Nouveau Compte
    $($('.form-connect').find('button')[1]).on('click', function () {
        renderRegisterPage();
    });
}
function showErrorForm(id) {
    $(`#${id}`).after();
}
function emptyUser() {
    let user = {};
    user.Avatar = "no-avatar.png"; user.Email = ""; user.Name = "";

    return user;
}
function install_timeout(stop = false) {
    $(window).off('.session');
    if (!stop) {
        timeout(sessionTimeout);
        $(window).on('click.session', function () {
            timeout(sessionTimeout);
        });
    }
}

function renderRegisterPage(user = null) {

    user = user == null ? emptyUser() : user;

    $('#form').empty();
    $('#form').append(`
        <input style="display:none;" id="Id" value="0" name="Id">
        <form class="form form-register flex-column">
            <div class="form-section">
                <label>Courriel</label>
                <div class="space-bottom-sm">
                    <input id="Email" type="text" name="Email" placeholder="Email" customErrorMessage="Ce courriel est déjà utilisé" value="${user.Email}">
                    <span style="top:-5px positons:relative; display:none;" class="error"><i></i></span>
                </div>
                
                <input type="text" placeholder="Vérification"  id="emailVerif" value="${user.Email}">
                <span style="top:-5px positons:relative; display:none;" class="error "><i></i></span>
            </div>
            
            <div class="form-section">
                <label>Mot de passe</label>
                <div class="space-bottom-sm">
                    <input type="password" name="Password" placeholder="Mot de passe" id="Password" class="space-bottom-sm" minlength="6">
                    <span style="top:-5px positons:relative; display:none;" class="error "><i></i></span>
                </div>
                
                <input type="password" placeholder="Vérification" id="passwordVerif">
                <span style="top:-5px positons:relative; display:none;" class="error "><i></i></span>
            </div>

            <div class="form-section">
                <label>Nom</label>
                <input type="Text" placeholder="Nom" name="Name" class="space-bottom-sm" Required id="Name" value="${user.Name}">
            </div>

            <div class="form-section">
                <label>Avatar</label>
                <div  class='imageUploader'  
                   controlId='Avatar' 
                   imageSrc='${user.Avatar}' 
                   waitingImage="Loading_icon.gif"
                   newImage="${user.Email == ""}">
            </div>
            </div>
        <button id="submit" class="blue space-bottom-sm">Enregister</button>
        ${e = user.Email == "" ? '<button class="grey">Annuler</button>' : '<button class="red">Effacer le compte</button>'}
        
        </form>
        `);
    showConnexion();
    $("#viewTitle").text("Inscription");
    $('.imageUploader').off();
    initImageUploaders();

    addConflictValidation(location.origin, 'Email', 'submit');

    $($('form').find('button')[1]).on('click', function (e) {
        e.preventDefault();
        if (user.Email == "") {
            showPosts();
        } else {
            renderDeleteAccount();
        }
    });
    $('form').on('submit', async function (e) {
        e.preventDefault();
        connexionClearErrors();
        let error = false;
        let errors = [];

        //email
        if (!(regexEmail.test($('#Email').val()))) {
            error = true;
            $('#Email + span').text("Email invalide").show();
            errors.push('Email');

        } else if ($('#Email').val() != $('#emailVerif').val()) {
            error = true;
            $('#emailVerif + span').text("Email différent").show();
            errors.push('emailVerif');
        }

        // password
        if ($('#Password').val() != $('#passwordVerif').val()) {
            error = true;
            $('#passwordVerif + span').text("Mot de passe différent").show();
            errors.push('passwordVerif');
        }

        if (error) {
            document.getElementById(errors[0]).scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
            let userEmail = connectedUser.Email;
            let formData = getFormData($('form'));
            let res;
            if (user.Email == "") {
                res = await Account_API.Register(formData);
                if (res == null) {
                    if (Account_API.currentStatus == 401) {
                        disconnect(false);
                        showError("Vous n'êtes pas autorisé. " + Account_API.currentHttpError);
                    } else {
                        showError("Une erreur est survenue! " + Account_API.currentHttpError);
                    }
                }
            } else {
                for (property in formData) {
                    connectedUser[property] = formData[property];
                }
                res = await Account_API.Modify(connectedUser);
                console.log(Account_API.currentStatus);
                if (res == null) {
                    if (Account_API.currentStatus == 401) {
                        disconnect(false);
                        showError("Vous n'êtes pas autorisé. " + Account_API.currentHttpError);
                    } else {
                        showError("Une erreur est survenue! " + Account_API.currentHttpError);
                    }
                } else {
                    connectedUser = res;
                }

            }
            if (res) {
                if (user.Email == "") {
                    renderLoginMessage(`Votre compte à été créé<br> Veuillez prendre
                            vos courriels pour récupérer votre code de vérification
                                qui vous vous sera demandé lors de votre prochaine connexion`);
                } else if (formData.Email != userEmail) {
                    disconnect(false);
                    renderLoginMessage(`Votre compte à été modifié ainsi que votre email<br> Veuillez prendre
                            vos courriels pour récupérer votre code de vérification
                                qui vous vous sera demandé lors de votre prochaine connexion`);
                } else {
                    showPosts();
                    updateDropDownMenu();
                }
            }
        }
    });
}
function renderDeleteAccount() {
    $('#form').empty();
    $('#form').append(`
        <form class="form form-connect flex-column">
        <div id="text" class="space-bottom">Voulez-vous vraiment effacer votre compte ?</div>
        
        <button class="red space-bottom" >Effacer mon compte</button>
        <button class="grey" >Annuler</button>
        </form>        
        `);
    $('form > .red').on('click', async function () {
        let res = await Account_API.Delete(connectedUser.Id, AccesToken);

        if (res == null) {
            showError("Une erreur est survenue! " + Account_API.currentHttpError);
        }else{
            disconnect();
        }
    });
    $($('form').find('button')[1]).on('click', function () {
        showPosts();
    });

    $('form').on('submit', function (e) {
        e.preventDefault();
    });
}
async function disconnect(redirect = true) {
    let res = await Account_API.Logout(connectedUser.Id);
    if (res) {

        connectedUser = false;
        AccesToken = null;
        sessionStorage.removeItem('token');
        noTimeout(true);

        if (redirect) {
            showPosts();
        } else {
            $('.Cmd').hide();
        }
    } else {
        showError("Une erreur est survenue! " + Account_API.currentHttpError);
    }
}
/////////////////////// USER ADMIN UI ///////////////////////////////////////////////////////
function isAdmin() {
    return connectedUser.Authorizations.readAccess >= 3 && connectedUser.Authorizations.writeAccess >= 3;
}
function isSuperUser() {
    return connectedUser.Authorizations.readAccess >= 2 && connectedUser.Authorizations.writeAccess >= 2;
}
async function renderAdminPage(queryStringAdminPage = "") {
    let userSearchTimeout, users;
    $("#viewTitle").text("Gestion des usagers");
    $("#form").empty();
    showConnexion();
    $('#form').append(`
        <div id="adminPage">
            <input type="search" placeholder="Recherche des usagers" id="userSearch">
            <div id="userContainer">
            </div>
        </div>    
    `);
    $('#userSearch').attr('value', queryStringAdminPage);
    renderUsers();

    $('#userSearch').on('keyup', function () {
        clearTimeout(userSearchTimeout);

        userSearchTimeout = setTimeout(async () => {
            renderUsers();
        }, 300);
    });
}
async function renderUsers() {
    $('#userContainer').empty();
    $('#userContainer').append($("<div id='waitingGif' class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>'"));
    // get Users
    queryStringAdminPage = "";
    let keys = $("#userSearch").val().replace(/[ ]/g, ',');
    if (keys !== "")
        queryStringAdminPage += "&keywords=" + $("#userSearch").val().replace(/[ ]/g, ',');
    let users = await Account_API.GetQuery('?' + queryStringAdminPage.substring(1).toLocaleLowerCase());
    $('#userContainer').empty();
    users.forEach(user => {
        renderUser(user);
    });
    appendEvents();

}
function appendEvents() {
    $('#userContainer').find('.promote').off();
    $('#userContainer').find('.deleteUser').off();
    $('#userContainer').find('.fa-ban').off();
    $('#userContainer').find('.promote').on('click', async function () {
        let user = await Account_API.Get($(this).attr('userId'));
        if (user != null) {
            //console.log(user.data);
           await Account_API.promote(user.data);
        }
        renderUsers();
    });

    $('#userContainer').find('.deleteUser').on('click', async function () {
        renderDeleteUser($(this).attr('userId'), $('#userSearch').val())
        //renderUsers();
    });
    $('#userContainer').find('.fa-ban').on('click', async function () {
        let user = await Account_API.Get($(this).attr('userId'));
        if (user != null) {
            await Account_API.block(user.data);
            renderUsers();
        }


    });
}

function renderUser(user) {
    if (user.Id != connectedUser.Id) {
        let userType, isBlocked;
        if (user.isAdmin === true) {
            userType = `<i class="fa-solid fa-user-secret cmdIcon promote" userId="${user.Id}"></i>`;
        } else
            if (user.isSuper === true) {
                userType = `<i class="fa-solid fa-user-tie cmdIcon promote" userId="${user.Id}"></i>`;
            } else {
                userType = `<i class="fa-solid fa-user cmdIcon promote" userId="${user.Id}"></i>`;
            }
        isBlocked = user.isBlocked == true ? `<i class="fa-solid fa-ban cmdIcon red " userId="${user.Id}"></i>` : `<i class="fa-solid fa-ban cmdIcon grey" userId="${user.Id}"></i>`;

        $('#userContainer').append(`
            <div class="userCard">
                <div class="userInfo">
                    <img src="${user.Avatar}"><span title="${user.Email}">${user.Name}</span>
                </div>
                <div class="userCmd">
                    ${userType}
                    ${isBlocked}
                    <i class="fa-solid fa-trash cmdIcon deleteUser" userId="${user.Id}"></i>
                </div>
            </div>`);
    }
}
async function renderDeleteUser(id, queryStringAdminPage = "") {
    let user = await Account_API.Get(id);
    $('#form').empty();
    $('#form').append(`
        <form class="form form-connect flex-column">
        <div id="text" class="space-bottom">Voulez-vous vraiment effacer <br><strong>${user.data.Name}</strong> ?</div>
        
        <button class="red space-bottom" >Effacer ${user.data.Name}</button>
        <button class="grey" >Annuler</button>
        </form>        
        `);
    $('form > .red').on('click', async function () {
        Account_API.Delete(id);
        renderAdminPage(queryStringAdminPage);
    });
    $($('form').find('button')[1]).on('click', function () {
        renderAdminPage(queryStringAdminPage);
    });

    $('form').on('submit', function (e) {
        e.preventDefault();
    });
}

/////////////////////// Posts content manipulation ///////////////////////////////////////////////////////

function linefeeds_to_Html_br(selector) {
    $.each($(selector), function () {
        let postText = $(this);
        var str = postText.html();
        var regex = /[\r\n]/g;
        postText.html(str.replace(regex, "<br>"));
    })
}
function highlight(text, elem) {
    text = text.trim();
    //console.log(text);
    if (text.length >= minKeywordLenth) {
        var innerHTML = elem.innerHTML;
        let startIndex = 0;

        while (startIndex < innerHTML.length) {
            var normalizedHtml = innerHTML.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            var index = normalizedHtml.indexOf(text, startIndex);
            //console.log(index);
            let highLightedText = "";
            if (index >= startIndex) {
                highLightedText = "<span class='highlight'>" + innerHTML.substring(index, index + text.length) + "</span>";
                innerHTML = innerHTML.substring(0, index) + highLightedText + innerHTML.substring(index + text.length);
                startIndex = index + highLightedText.length + 1;
            } else
                startIndex = innerHTML.length + 1;
        }
        elem.innerHTML = innerHTML;
    }
}
function highlightKeywords() {
    if (showKeywords) {
        let keywords = $("#searchKeys").val().split(' ');
        if (keywords.length > 0) {
            keywords.forEach(key => {
                let titles = document.getElementsByClassName('postTitle');
                Array.from(titles).forEach(title => {
                    highlight(key, title);
                })
                let texts = document.getElementsByClassName('postText');
                Array.from(texts).forEach(text => {
                    highlight(key, text);
                })
            })
        }
    }
}



//////////////////////// Forms rendering /////////////////////////////////////////////////////////////////

async function renderEditPostForm(id) {
    $('#commit').show();
    addWaitingGif();
    let response = await Posts_API.Get(id)
    if (!Posts_API.error) {
        let Post = response.data;
        if (Post !== null)
            renderPostForm(Post);
        else
            showError("Post introuvable!");
    } else {
        showError(Posts_API.currentHttpError);
    }
    removeWaitingGif();
}
async function renderDeletePostForm(id) {
    let response = await Posts_API.Get(id)
    if (!Posts_API.error) {
        let post = response.data;
        if (post !== null) {
            let date = convertToFrenchDate(UTC_To_Local(post.Date));
            $("#form").append(`
                <div class="post" id="${post.Id}">
                <div class="postHeader">  ${post.Category} </div>
                <div class="postTitle ellipsis"> ${post.Title} </div>
                <img class="postImage" src='${post.Image}'/>
                <div class="postDate"> ${date} </div>
                <div class="postTextContainer showExtra">
                    <div class="postText">${post.Text}</div>
                </div>
            `);
            linefeeds_to_Html_br(".postText");
            // attach form buttons click event callback
            $('#commit').on("click", async function () {
                await Posts_API.Delete(post.Id);
                if (!Posts_API.error) {
                    await showPosts();
                }
                else {
                    console.log(Posts_API.currentHttpError)
                    showError("Une erreur est survenue!");
                }
            });
            $('#cancel').on("click", async function () {
                await showPosts();
            });

        } else {
            showError("Post introuvable!");
        }
    } else
        showError(Posts_API.currentHttpError);
}
function newPost() {
    let Post = {};
    Post.Id = 0;
    Post.Title = "";
    Post.Text = "";
    Post.Image = "news-logo-upload.png";
    Post.Category = "";
    return Post;
}
function renderPostForm(post = null) {
    let create = post == null;
    if (create) post = newPost();
    $("#form").show();
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="postForm">
            <input type="hidden" name="Id" value="${post.Id}"/>
             <input type="hidden" name="Date" value="${post.Date}"/>
            <label for="Category" class="form-label">Catégorie </label>
            <input 
                class="form-control"
                name="Category"
                id="Category"
                placeholder="Catégorie"
                required
                value="${post.Category}"
            />
            <label for="Title" class="form-label">Titre </label>
            <input 
                class="form-control"
                name="Title" 
                id="Title" 
                placeholder="Titre"
                required
                RequireMessage="Veuillez entrer un titre"
                InvalidMessage="Le titre comporte un caractère illégal"
                value="${post.Title}"
            />
            <label for="Url" class="form-label">Texte</label>
             <textarea class="form-control" 
                          name="Text" 
                          id="Text"
                          placeholder="Texte" 
                          rows="9"
                          required 
                          RequireMessage = 'Veuillez entrer une Description'>${post.Text}</textarea>

            <label class="form-label">Image </label>
            <div class='imageUploaderContainer'>
                <div class='imageUploader' 
                     newImage='${create}' 
                     controlId='Image' 
                     imageSrc='${post.Image}' 
                     waitingImage="Loading_icon.gif">
                </div>
            </div>
            <div id="keepDateControl">
                <input type="checkbox" name="keepDate" id="keepDate" class="checkbox" checked>
                <label for="keepDate"> Conserver la date de création </label>
            </div>
            <input type="submit" value="Enregistrer" id="savePost" class="btn btn-primary displayNone">
        </form>
    `);
    if (create) $("#keepDateControl").hide();

    initImageUploaders();
    initFormValidation(); // important do to after all html injection!

    $("#commit").click(function () {
        $("#commit").off();
        return $('#savePost').trigger("click");
    });
    $('#postForm').on("submit", async function (event) {
        event.preventDefault();
        let post = getFormData($("#postForm"));
        if (post.Category != selectedCategory)
            selectedCategory = "";
        if (create || !('keepDate' in post))
            post.Date = Local_to_UTC(Date.now());
        delete post.keepDate;
        post.OwnerId = connectedUser.Id;
        post = await Posts_API.Save(post, create);
        if (!Posts_API.error) {
            await showPosts();
            postsPanel.scrollToElem(post.Id);
        }
        else
            showError("Une erreur est survenue! ", Posts_API.currentHttpError);
    });
    $('#cancel').on("click", async function () {
        await showPosts();
    });
}
function getFormData($form) {
    // prevent html injections
    const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
    var jsonObject = {};
    // grab data from all controls
    $.each($form.serializeArray(), (index, control) => {
        jsonObject[control.name] = control.value.replace(removeTag, "");
    });
    return jsonObject;
}
