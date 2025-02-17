;(function($){
    var chars = []; //liste des persos (fetch)
    var foes = [];  //liste des ennemis (fetch)
    var deck = []; //ennemis pas encore piochés
    var dojo = []; //ennemis ajoutés au dojo
    var currentChar = null; // perso selectionné pour le round
    var wl = [2,0]; // 0-1-2, 1er rounds joueur, 2e rounds cpu
    var currentTurn = 1; // pour les probas du cpu
    var newDraw = null;
    var fightPlayerHP = 0;
    var fightPlayerMaxHP = 0;
    var fightPlayerPerks = [];
    var hasWon = false; // avec cookie 15j
    var isHof = false; // avec cookie 15j
    var homeChars = []; // persos affichés sur l'accueil
    // var odds = [[20,50], [1,2]];
    var odds = [[20,66], [8,33]]; // facile, difficile
    var diff = 0;
    var nbRemainingPerks = 0; // pour savoir s'il reste de l'eqpmt pdt la phase de pioche
    var txtCpu = {}; // textes affichés dynamiquement
    var txtSplash = {}; // textes affichés dynamiquement

    $(function(){ // chargement page
        // Nouvelle partie
        $(document).on('click', '.jsNewGame', {diff: null}, newGame); //e.data.diff
        $(document).on('click', '.jsNewGameEasy', {diff: 0}, newGame);
        $(document).on('click', '.jsNewGameHard', {diff: 1}, newGame);
        // Afficher/cacher les règles
        $(document).on('click', '.jsRules', {show: true}, rulesShow);
        $(document).on('click', '.jsRulesClose', {show: false}, rulesShow);
        $(document).on('click', '.jsDeleteCookies', deleteCookies);
        // Retour au menu
        $(document).on('click', '.jsMenu', goBackHome);
        // Selection du perso
        $(document).on('click', '.jsGoToSelectChar', goToSelect);
        $(document).on('click', '.jsSelectChar', selectChar);
        // Phase de pioche
        $(document).on('click', '.jsDraw', drawCard);
        $(document).on('click', '.jsAddDojo', addDojo);
        $(document).on('click', '.jsGoToSacrEqpmt', goToSacrEqpmt);
        $(document).on('click', '.drawPhase__perks--select .jsSacrEqpmt', sacrEqpmt);
        $(document).on('click', '.jsIgnore', choiceIgnore);
        // Combat
        $(document).on('click', '.jsGo', {tagteam: false}, fightGo);
        $(document).on('click', '.jsTagTeam', {tagteam: true}, fightGo);

        getData();
    });

    function deleteCookies(){
        var date = new Date();
        date.setTime(date.getTime() - 1);
        document.cookie = "hasWon=; expires=" + date.toUTCString() + "; path=/";
        document.cookie = "isHof=; expires=" + date.toUTCString() + "; path=/";
        hideShow('.jsDeleteCookies', null);
    }

    function getData(){ // recupère les données des persos, des ennemis, et des textes
        var ca = document.cookie.split(';');
        for(var i=0;i < ca.length;i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1,c.length);
            if (c.indexOf("hasWon=") == 0){
                hasWon = true;
                hideShow(null, '.jsDeleteCookies');
            }else if(c.indexOf("isHof=") == 0){
                isHof = true;
                $('.rules__char:not(.rules__char--foe)').addClass('rules__char--hof');
                hideShow(null, '.jsDeleteCookies');
            }
        }
        fetchData();
    }

    async fetchData(){
        const fetchChars = await fetch('https://verduwilliam.github.io/testjson/assets/json/characters.json');
        const fetchFoes = await fetch('https://verduwilliam.github.io/testjson/assets/json/foes.json');
        const fetchTexts = await fetch('https://verduwilliam.github.io/testjson/assets/json/txt.json');
        resultChars = await fetchChars.json();
        resultFoes = await fetchFoes.json();
        resultTexts = await fetchTexts.json();
        Promise.all([resultChars, resultFoes, resultTexts]).then(()=>{
            chars = resultChars.chars;
            foes = resultFoes.foes;
            txtCpu = resultTexts.cpu;
            txtSplash = resultTexts.splash;
            initHTML();
        })
    }

    function initHTML(){ // remplit la page avec les données de getData
        // Accueil : images persos
        let homeFriends = chars.toSorted(() => 0.5 - Math.random()).slice(0, 3);
        let homeFoes = foes.toSorted(() => 0.5 - Math.random()).slice(0, 3);
        homeChars = [];
        for(let i = 0; i<3; i++){
            homeChars.push(homeFriends[i], homeFoes[i]);
        }
        homeChars.forEach((c, i) => {
            $('.home').append('<img src="./assets/img/chars/'+c.img+'" alt="'+c.name+'" class="home__char hidden hidden--left" id="homeChar'+i+'">');
        })
        
        let htmlRulesFighters = ``;
        let htmlSelect = ``;
        chars.forEach((char, id) => {
            let htmlPerks = ``;
            char.perks.forEach(perk => {
                // equipement
                htmlPerks += `
                    <div class="perk">
                        <div class="perk__img"><img src="./assets/img/perks/`+perk.img+`" alt="`+perk.name+`"></div>
                        <div class="perk__infos">
                            <div>
                                <h5 class="perk__infos__name">`+perk.name+`</h5>
                                <p class="perk__infos__effect">`+perk.desc+`</p>
                            </div>
                        </div>
                    </div>
                `;
            })
            // Règles : carousel persos
            let classChar = 'rules__char swiper-slide';
            if(isHof){
                classChar = 'rules__char rules__char--hof swiper-slide';
            }
            let htmlChar = `
                <div class="`+classChar+`">
                    <div class="rules__char__img rules__char__img--`+id+`"><img src="./assets/img/chars/`+char.img+`" alt="`+char.name+`"></div>
                    <div class="rules__char__infos">
                        <div class="rules__char__hp"><span>`+char.basehp+`</span>PV</div>
                        <h4 class="rules__char__name">`+char.name+`</h4>
                        <div class="rules__char__grid">
                            `+htmlPerks+`
                        </div>
                    </div>
                </div>
            `;
            // Ecran selection perso
            let htmlSelectChar = `
                <div class="selectChar__card jsSelectChar hidden hidden--left" data-id="`+id+`">
                    <div class="selectChar__card__img" style="--comp-color: drop-shadow(20px -20px 0px `+char.comp_color+`);">
                        <img src="./assets/img/chars/`+char.img+`" alt="`+char.name+`">
                    </div>
                    <div class="selectChar__card__hp"><span>`+char.basehp+`</span>PV</div>
                    <div class="selectChar__card__name">`+char.name+`</div>
                    `+htmlPerks+`
                </div>
            `;
            htmlRulesFighters += htmlChar;
            htmlSelect += htmlSelectChar;
        });
        $('.rules__fighters .swiper-wrapper').html(htmlRulesFighters);
        $('.selectChar__loop').html(htmlSelect);
        // Règles : swiper carousel persos
        const swiperRulesFighters = new Swiper('.rules__fighters', {
            allowTouchMove: true,
            spaceBetween: 20,
            autoHeight: true,
            loop: true,
            navigation: {
                nextEl: '.rules__fighters .swiper-button-next',
                prevEl: '.rules__fighters .swiper-button-prev',
            },
            pagination: {
                el: '.rules__fighters .swiper-pagination',
                type: 'bullets',
            },
            slidesPerView: 1,
            breakpoints: {
                768: {
                    allowTouchMove: false
                }
            }
        });

        let htmlRulesFoes = ``;
        let htmlIgnore = ``;
        foes.forEach(foe => {
            // Combat : choix avant un round de l'ennemi à ignorer
            htmlIgnore += `
                <div class="drawPhase__card__side jsIgnore" data-pwr="`+foe.power+`" data-name="`+foe.name+`">
                    <img src="./assets/img/chars/`+foe.img+`" alt="`+foe.name+`" class="drawPhase__card__img">
                    <p class="drawPhase__card__name">`+foe.name+`</p>
                    <p class="drawPhase__card__pwr">`+foe.power+`</p>
                </div>
            `;
            // Règles : carousel ennemis
            htmlRulesFoes += `
                <div class="rules__char rules__char--foe swiper-slide">
                    <div class="rules__char__img"><img src="./assets/img/chars/`+foe.img+`" alt="`+foe.name+`"></div>
                    <div class="rules__char__infos">
                        <h4 class="rules__char__name">`+foe.name+`</h4>
                        <p class="rules__char__hp"><span>`+foe.power+`</span>Pwr</p>
                        <p class="rules__char__misc">`+foe.misc+`</p>
                    </div>
                </div>
            `;
        })
        $('.splash--ignore__grid').html(htmlIgnore);
        $('.rules__foes .swiper-wrapper').html(htmlRulesFoes);
        if(hasWon){
            $('.rules__foes').removeClass('locked');
        }
        // Règles : swiper carousel ennemis
        const swiperRulesFoes = new Swiper('.rules__foes', {
            allowTouchMove: true,
            spaceBetween: 20,
            autoHeight: true,
            loop: true,
            navigation: {
                nextEl: '.rules__foes .swiper-button-next',
                prevEl: '.rules__foes .swiper-button-prev',
            },
            pagination: {
                el: '.rules__foes .swiper-pagination',
                type: 'bullets',
            },
            slidesPerView: 1,
            breakpoints: {
                768: {
                    allowTouchMove: false
                }
            }
        });

        animHome();
    }

    function newGame(e){ // nouvelle partie
        if(e.data.diff){
            diff = e.data.diff;
        }
        wl = [0,0];
        $('.fight__ui__rounds span').css('background-color', 'transparent');
        animRound();
    }

    function initRound(){ // nouvelle manche
        deck = [];
        dojo = [];
        currentTurn = 1;
        foes.forEach(foe => {
            if(Number.isInteger(foe.nb) && foe.nb>0){
                for(let i = 0; i<foe.nb; i++){
                    deck.push(foe);
                }
            }
        });
        deck.sort(() => 0.5 - Math.random()); // melange le deck
        initHtmlDrawPhase();
        updateInfosDeck();
    }

    function initHtmlDrawPhase(){ // reset la phase de pioche avec le perso selectionné
        nbRemainingPerks = 0;
        $('.jsGoToSacrEqpmt').removeClass('disabled');
        let htmlNbCards = `
            <div class="drawPhase__nb">
                <div class="drawPhase__nb__deck">14</div>
                <div class="drawPhase__nb__dojo">0</div>
            </div>
            <div class="drawPhase__perks"></div>
        `;
        $('.drawPhase__bottom').html(htmlNbCards);
        currentChar.perks.forEach((child, i) => {
            child.actv = true;
            nbRemainingPerks++;
            let htmlPerks = `
                <div class="perk jsSacrEqpmt" data-id="`+i+`">
                    <div class="perk__img"><img src="./assets/img/perks/`+child.img+`" alt="`+child.name+`"></div>
                    <div class="perk__infos">
                        <div>
                            <h5 class="perk__infos__name">`+child.name+`</h5>
                            <p class="perk__infos__effect">`+child.desc+`</p>
                        </div>
                    </div>
                </div>
            `;
            $('.drawPhase__perks').append(htmlPerks);
        })
    }

    function updateInfosDeck(){ // màj les indications de cartes restantes
        if(deck.length>9){
            $('.drawPhase__deck').addClass('drawPhase__deck--big');
            $('.drawPhase__deck').removeClass('drawPhase__deck--mid drawPhase__deck--sm');
        }else if(deck.length>4){
            $('.drawPhase__deck').addClass('drawPhase__deck--mid');
            $('.drawPhase__deck').removeClass('drawPhase__deck--big drawPhase__deck--sm');
        }else{
            $('.drawPhase__deck').addClass('drawPhase__deck--sm');
            $('.drawPhase__deck').removeClass('drawPhase__deck--big drawPhase__deck--mid');
        }
        $('.drawPhase__nb__deck').text(deck.length);
        $('.drawPhase__nb__dojo').text(dojo.length);
    }

    function roundWon(){ // manche gagnée
        // affichage rounds
        $('.fight__ui--p1 .fight__ui__rounds span').eq(wl[0]).css('background-color', '#FFD700');
        
        wl[0]++;

        $('.fight').addClass('fight--dark');
        hideShow(null, '.splash--win');
        setTimeout(()=>{
            if(wl[0]<2){
                hideShow('.fight__round, .fight__ui, .fight__btns, .fight__imgs', null);
                animRound();
            }else{
                animWin();
            }
        }, 2000)
    }

    function roundLost(){ // manche perdue
        // affichage rounds
        $('.fight__ui--p2 .fight__ui__rounds span').eq(wl[1]).css('background-color', '#FFD700');
        
        wl[1]++;

        $('.fight').addClass('fight--dark');
        hideShow(null, '.splash--lose');
        setTimeout(()=>{
            hideShow('.fight__round, .fight__ui, .fight__btns, .fight__imgs', null);
            if(wl[1]<2){
                goToSelect();
            }else{
                hideShow('.splash--lose', '.splash--gameover');
            }
        }, 2000)
    }

    function goToSelect(){ // vers l'écran de selection du perso
        if(wl[0]>0){
            $('.fight').css('background-image', 'url("./assets/img/bg/stage2.jpg")');
        }else{
            $('.fight').css('background-image', 'url("./assets/img/bg/stage1.jpg")');
        }
        $('.fight').addClass('fight--dark');
        $('.selectChar__card').removeClass('selectChar__card--selected');
        hideShow('.splash, .drawPhase, .selectChar__card, .fight__round, .fight__ui, .fight__btns, .fight__imgs', '.selectChar, .fight');
        let i = 1;
        let intervalSelect = setInterval(()=>{
            if(i<=$('.selectChar__card').length){
                hideShow(null, '.selectChar__card:nth-child('+i+')');
            }else{
                clearInterval(intervalSelect);
            }
            i++;
        }, 400);
    }

    function selectChar(){ // choix du perso
        let id = $(this).data('id');
        currentChar = chars[id];
        initRound();
        $('.selectChar__card[data-id='+id+']').addClass('selectChar__card--selected');
        let i = 1;
        let intervalSelect = setInterval(()=>{
            if(i<=$('.selectChar__card').length){
                hideShow('.selectChar__card:nth-child('+i+')', null);
            }else{
                hideShow('.selectChar', '.drawPhase');
                clearInterval(intervalSelect);
            }
            i++;
        }, 400);
    }

    function drawCard(){ // pioche
        $('.jsDraw').addClass('disabled');
        newDraw = deck[0];
        let htmlCard = `
            <img src="./assets/img/chars/`+newDraw.img+`" alt="`+newDraw.name+`" class="drawPhase__card__img">
            <div class="drawPhase__card__name">`+newDraw.name+`</div>
            <div class="drawPhase__card__pwr">`+newDraw.power+`</div>
        `;
        $('.drawPhase__card__side:not(.jsIgnore)').html(htmlCard);
        $('.drawPhase__card').addClass('drawPhase__card--selected');
        hideShow('.drawPhase__pass', '.drawPhase__infos');
        deck.splice(0, 1);
        $('.drawPhase__nb__deck').text(deck.length);
        updateInfosDeck();
    }

    function addDojo(){ // ajout de la carte piochée dans le dojo
        dojo.push(newDraw);
        updateInfosDeck();
        cpuTurn();
    }

    function goToSacrEqpmt(){ // possibilité sacr eqpmt
        $('.drawPhase__perks').addClass('drawPhase__perks--select');
    }

    function sacrEqpmt(){ // sacr eqpmt
        let i = $(this).data('id');
        nbRemainingPerks--;
        currentChar.perks[i].actv = false;
        $('.drawPhase__perks .perk[data-id='+i+']').addClass('perk--ko');
        $('.drawPhase__perks .perk[data-id='+i+']').removeClass('jsSacrEqpmt');
        cpuTurn();
    }

    function cpuTurn(){ // tour de l'ordi
        // 3 possibilités
        // (1) pioche et ajoute au dojo
        // (2) pioche et sacr eqpmt
        // (3) passe son tour (le joueur passe au combat)
        animTextCPU('think');
        $('.drawPhase__perks').removeClass('drawPhase__perks--select');
        hideShow('.drawPhase__infos', null);
        let fightStart = false;
        let rd = Math.floor(Math.random()*100); // 1-99
        newDraw = deck[0];
        deck.splice(0, 1);
        setTimeout(()=>{
            $('.drawPhase__card').removeClass('drawPhase__card--selected');
            $('.jsDraw').removeClass('disabled');
            hideShow(null, '.drawPhase__pass');
            if(rd<(currentTurn*odds[diff][0]) && dojo.length>0){
                // passe (3)
                animTextCPU('retire');
                fightStart = true;
            }else if(rd>(currentTurn*odds[diff][1]) && nbRemainingPerks>0){
                // sacr eqpmt (2)
                nbRemainingPerks--;
                let i = Math.floor(Math.random() * 6);
                while(currentChar.perks[i].actv == false){
                    i = Math.floor(Math.random() * 6);
                }
                currentChar.perks[i].actv = false;
                $('.drawPhase__perks .perk[data-id='+i+']').addClass('perk--ko');
                $('.drawPhase__perks .perk[data-id='+i+']').removeClass('jsSacrEqpmt');
                animTextCPU('sacrifice');
            }else{
                // ajout dojo (1)
                animTextCPU('add');
                dojo.push(newDraw);
            }
            // check si on peut encore sacr eqpmt
            if(nbRemainingPerks<=0){
                $('.jsGoToSacrEqpmt').addClass('disabled');
            }
            setTimeout(()=>{
                if(!fightStart){
                    currentTurn++;
                    updateInfosDeck();
                    if(deck.length>0){
                        // tour du joueur
                        hideShow('.splash--cpu', '.drawPhase');
                    }else{
                        // si deck vide, debut du combat
                        animTextCPU('nodeck');
                        setTimeout(initStartFight, 2500);
                    }
                }else{
                    initStartFight();
                }
            }, 2500)
        }, 1500)
    }

    function initStartFight(){ // debut combat
        hideShow('.splash, .jsTagTeam', null);

        // affichage round actuel
        if( (wl[0]+wl[1]) <= 1 ){
            $('.fight__round').html('<div>Round</div><div>'+(1+wl[0]+wl[1])+'</div>');
        }else{
            $('.fight__round').html('<div>Final</div><div>Round</div>');
        }

        dojo.sort(() => 0.5 - Math.random()); // melange le dojo

        // verifs perks
        fightPlayerHP = Number(currentChar.basehp);
        fightPlayerPerks = [];
        let checkIfPopupIgnore = false;
        currentChar.perks.forEach(child => {
            if(child.actv){
                if(child.effect=='hp'){
                    // augmentation pv joueur
                    fightPlayerHP += Number(child.effect_val);
                }else if(child.effect=='ignoreChoiceBefore'){
                    // popup pour choisir l'ennemi à ignorer pour cette manche
                    checkIfPopupIgnore = true;
                }else{
                    // ajout à la liste des perks utilisables cette manche
                    fightPlayerPerks.push(child);
                }
            }
        })
        fightPlayerMaxHP = fightPlayerHP;
        $('.fight__ui__perks, .fight__ui__dojo').html('');
        if(checkIfPopupIgnore){
            popupIgnore();
        }else{
            startFight();
        }     
    }

    function startFight(){
        fightPlayerPerks.forEach(child=>{
            let htmlPerks = `
                <div class="perk perk--fight">
                    <div class="perk__img"><img src="./assets/img/perks/`+child.img+`" alt="`+child.name+`"></div>
                    <div class="perk__infos">
                        <h5 class="perk__infos__name">`+child.name+`</h5>
                        <p class="perk__infos__effect">`+child.desc+`</p>
                    </div>
                </div>
            `;
            $('.fight__ui__perks').append(htmlPerks);
        })

        // affichage du nb d'ennemis restants
        for(let i = 0; i<5 && i<dojo.length; i++){
            $('.fight__ui__dojo').append('<div class="fight__ui__dojo__card"></div>');
        }
        if(dojo.length>5){
            $('.fight__ui__dojo').append('<div class="pixText">x'+dojo.length+'</div>');
        }

        fightUI('100%', null);
        newFoe();

        $('.fight').removeClass('fight--dark');
        hideShow(null, '.fight__ui, .fight__btns, .fight__imgs, .fight__img');
        setTimeout(()=>{
            hideShow(null, '.fight__round');
        }, 500)
    }

    function choiceIgnore(){
        hideShow('.splash--ignore', null);
        let selectedName = $(this).data('name');
        let selectedPower = $(this).data('pwr');
        currentChar.perks.forEach((child)=>{
            if(child.effect == 'ignoreChoiceBefore'){ // utilisable sur ennemi
                fightPlayerPerks.push({
                    "name": child.name,
                    "img": child.img,
                    "desc": "Ignorez chaque "+selectedName+" pour ce round",
                    "effect": "ignore",
                    "effect_val": [selectedPower],
                    actv: true
                });
            }
        })
        startFight();
    }

    function newFoe(){ // UI ennemis
        fightUI(null, '100%');
        hideShow(null, '.fight__ui--p2, .fight__img--p2');
        setTimeout(fightUiPerks, 500);
    }

    function fightUI(p1, p2){ // barre de vie/nom/image
        // p1
        $('.fight__ui--p1 .fight__ui__pv--current').html(fightPlayerHP);
        $('.fight__ui--p1 .fight__ui__pv--max').html('/'+fightPlayerMaxHP);
        $('.fight__ui--p1 .fight__ui__name').html(currentChar.name);
        $('.fight__img--p1').attr('src', './assets/img/chars/'+currentChar.img);

        // p2
        $('.fight__ui--p2 .fight__ui__pv span').html(dojo[0].power);
        $('.fight__ui--p2 .fight__ui__name').html(dojo[0].name);
        $('.fight__img--p2').attr('src', './assets/img/chars/'+dojo[0].img);

        let newHeight = 120 + $('.fight__ui--p2 .fight__ui__name').outerHeight();
        let newTop = 90 + $('.fight__ui--p2 .fight__ui__name').outerHeight();
        $('.fight__ui--p2 .fight__ui__border').css('--mobHeight', newHeight+'px');
        $('.fight__ui--p2 .fight__ui__pv').css('--mobTop', newTop+'px');

        if(p1){
            $('.fight__ui--p1 .fight__ui__pv').css({"--percent": p1});
        }
        if(p2){
            $('.fight__ui--p2 .fight__ui__pv').css({"--percent": p2});
        }
    }

    function fightUiPerks(){ // affichage si perks encore utilisables ou ko
        hideShow('.jsTagTeam', null);
        let checkIfSkip = false;
        let iTag = null;
        let iRez = null;
        fightPlayerPerks.forEach((child,i)=>{
            if(!child.actv){ // utilisé
                $('.fight__ui__perks .perk').eq(i).removeClass('perk--available');
                $('.fight__ui__perks .perk').eq(i).addClass('perk--unavailable perk--ko');

            }else if(
                ( child.effect == 'ignore' && child.effect_val.includes(dojo[0].power) ) ||
                ( child.effect == 'ignoreHeal' && child.effect_val.includes(dojo[0].power) )
            ){ // utilisable sur ennemi
                checkIfSkip = true;
                $('.fight__ui__perks .perk').eq(i).removeClass('perk--unavailable perk--ko');
                $('.fight__ui__perks .perk').eq(i).addClass('perk--available');

            }else if(
                ( child.effect == 'rez' && dojo[0].power >= fightPlayerHP )
            ){ // utilisable sur ennemi
                iRez = i;
                $('.fight__ui__perks .perk').eq(i).removeClass('perk--available perk--ko');
                $('.fight__ui__perks .perk').eq(i).addClass('perk--unavailable');

            }else if(( child.effect == 'ignoreChoice' )){ // tag team dipo
                iTag = i;
                $('.fight__ui__perks .perk').eq(i).removeClass('perk--available perk--ko');
                $('.fight__ui__perks .perk').eq(i).addClass('perk--unavailable');

            }else{ // non utilisable sur ennemi actuel
                $('.fight__ui__perks .perk').eq(i).removeClass('perk--available perk--ko');
                $('.fight__ui__perks .perk').eq(i).addClass('perk--unavailable');
            }
        })
        // surligner tagteam/rez seulement si nécessaire
        if(!checkIfSkip && iTag){
            $('.fight__ui__perks .perk').eq(iTag).removeClass('perk--unavailable perk--ko');
            $('.fight__ui__perks .perk').eq(iTag).addClass('perk--available');
            hideShow(null, '.jsTagTeam');
        }
        if(!checkIfSkip && iRez){
            $('.fight__ui__perks .perk').eq(iRez).removeClass('perk--unavailable perk--ko');
            $('.fight__ui__perks .perk').eq(iRez).addClass('perk--available');
        }
    }

    function fightGo(e){ // combat
        let i = 0;
        let skipped = false;
        let tagteam = e.data.tagteam;
        while(i<fightPlayerPerks.length && !skipped){
            if( // si tag team
                tagteam && fightPlayerPerks[i].actv && fightPlayerPerks[i].effect=='ignoreChoice' 
            ){
                fightPlayerPerks[i].actv = false; fightUiPerks();
                skipped = true;

            }else if( // si ajout pv
                !tagteam && fightPlayerPerks[i].actv && (
                ( fightPlayerPerks[i].effect == 'ignoreHeal' && fightPlayerPerks[i].effect_val.includes(dojo[0].power) )
            )){
                fightPlayerHP += Number(dojo[0].power);
                if(fightPlayerMaxHP < fightPlayerHP){
                    fightPlayerMaxHP = fightPlayerHP;
                }
                skipped = true;

            }else if( // si eqpmt d'ignorement
                !tagteam && fightPlayerPerks[i].actv && (
                ( fightPlayerPerks[i].effect == 'ignore' && fightPlayerPerks[i].effect_val.includes(dojo[0].power) )
            )){
                skipped = true;

            }else if( // si ko mais possibilité de rez
                !tagteam && fightPlayerPerks[i].actv && (
                ( fightPlayerPerks[i].effect == 'rez' && dojo[0].power >= fightPlayerHP )
            )){
                fightPlayerPerks[i].actv = false; fightUiPerks();
                fightPlayerHP = Number(fightPlayerPerks[i].effect_val);
                skipped = true;
            }
            i++;
        }

        if(skipped || fightPlayerHP > dojo[0].power){ // p2 ko
            if(!skipped){
                fightPlayerHP -= dojo[0].power;
            }
            let newPercent = fightPlayerHP * 100 / fightPlayerMaxHP;
            fightUI(newPercent+'%', '0');
            $('.fight__ui--p2 .fight__ui__pv span').html('0');
            if(dojo.length>5){ // ui nb ennemis restants
                $('.fight__ui__dojo .pixText').html('x'+(dojo.length - 1));
            }else{
                $('.fight__ui__dojo__card:not(.anim)').eq(0).addClass('anim');
                $('.fight__ui__dojo .pixText').remove();
            }
            hideShow('.fight__img--p2', null);
            if(dojo.length>1){ // check si dernier ennemi
                dojo.splice(0, 1);
                setTimeout(newFoe, 1500);
            }else{
                setTimeout(roundWon, 1500);
            }
        }else{ // p1 ko
            let newHP = dojo[0].power - fightPlayerHP;
            let newPercent = newHP * 100 / dojo[0].power;
            fightPlayerHP = 0;
            fightUI('0', newPercent+'%');
            $('.fight__ui--p2 .fight__ui__pv span').html(newHP);
            hideShow('.fight__img--p1', null);
            setTimeout(roundLost, 1500);
        }
    }

    function popupIgnore(){
        // cache les options déjà ignorées
        hideShow(null, '.drawPhase__card__side.jsIgnore', null);
        fightPlayerPerks.forEach(child=>{
            if(child.effect=='ignore' || child.effect=='ignoreHeal'){
                child.effect_val.forEach(pwr=>{
                    hideShow('.drawPhase__card__side[data-pwr='+pwr+']', null);
                })
            }
        })
        hideShow(null, '.splash--ignore');
    }

    function resetSplash(){
        hideShow('.splash--round__step, .splash--round__img, .splash--round .pixText', null);
        $('.splash--round .pixText').html('');
    }

    function animHome(){
        for(let i = 0; i<=6; i++){
            if(i<6){
                setTimeout(()=>{
                    hideShow(null, '#homeChar'+i);
                }, i*200)
            }else{
                setTimeout(()=>{
                    hideShow(null, '.home > *');
                }, 1500)
            }
        }
    }

    function animTextCPU(val){
        let img = val;
        if(val=='nodeck'){
            img = 'retire';
        }
        hideShow('.drawPhase, .splash--cpu__img', '.splash--cpu, .splash--cpu__img--'+img);
        $('.splash--cpu .pixText').html('');
        let i = 0;
        let j = 0;
        let intervalText = setInterval(()=>{
            if( i <= txtCpu[val].length ){
                $('.splash--cpu .pixText').html(txtCpu[val].substring(0,i));
                i++;
            }else if((val=='retire' || val=='nodeck') && ( j <= txtCpu.enter.length )){
                $('.splash--cpu .pixText').html(txtCpu[val] + '<br>' + txtCpu.enter.substring(0,j));
                j++;
            }else{
                clearInterval(intervalText);
            }
        }, 17);
    }

    function animText(){
        var newTextSplash = "";
        var newTextSplashBuffer = "";
        var selector = '.splash--round--'+wl[0]+' .pixText';
        hideShow(null, selector);
        let i = 0; // index du paragraphe
        let j = 0; // index du caractere
        let intervalText = setInterval(()=>{
            if( j < txtSplash[wl[0]][i].text.length ){
                newTextSplash = newTextSplashBuffer + '<'+txtSplash[wl[0]][i].tag+'>' + txtSplash[wl[0]][i].text.substring(0,j) + '</'+txtSplash[wl[0]][i].tag+'>';
                $(selector).html(newTextSplash);
                j++;
            }else{
                let tmpTxt = txtSplash[wl[0]][i].text;
                if(txtSplash[wl[0]][i].special.length){
                    txtSplash[wl[0]][i].special.forEach(child => {
                        tmpTxt = tmpTxt.replaceAll(child.original, child.replace);
                    });
                }
                newTextSplashBuffer = newTextSplashBuffer + '<'+txtSplash[wl[0]][i].tag+'>' + tmpTxt + '</'+txtSplash[wl[0]][i].tag+'>';
                $(selector).html(newTextSplashBuffer);
                if(i<txtSplash[wl[0]].length-1){
                    i++;
                    j = 0;
                }else if(wl[0]<2){
                    setTimeout(()=>{
                        $(selector).append('<button class="btn btn--orange jsGoToSelectChar">Go!</button>');
                    }, 1000)
                    clearInterval(intervalText);
                }else{
                    setTimeout(()=>{
                        $(selector).append('<button class="btn btn--blue jsMenu">Retour au menu</button>');
                    }, 1000)
                    clearInterval(intervalText);
                }
            }
        }, 12);
    }

    function animRound(){
        resetSplash();
        hideShow('.home, .home > *, .rules, .splash, .fight__round, .fight__ui, .fight__btns, .fight__imgs', '.splash--round--'+wl[0]);
        let totalTime = 0;
        let delay = 0;
        let stepDuration = 0;
        $('.splash--round--'+wl[0]+' .splash--round__step').each(function(){
            stepDuration = 0;
            setTimeout(()=>{
                hideShow(null, this);
            }, totalTime)
            $(this).find('.splash--round__img').each(function(){
                let imgTime = parseInt($(this).css('--duration')) + parseInt($(this).css('--delay'));
                if(stepDuration < imgTime){
                    stepDuration = imgTime;
                }
                delay = totalTime + parseInt($(this).css('--delay'));
                setTimeout(()=>{
                    hideShow(null, this);
                }, delay)
            })
            totalTime += stepDuration;
        })
        totalTime += 500;
        setTimeout(()=>{
            hideShow('.fight__img', null);
            animText();
        }, totalTime)
    }

    function animWin(){
        hasWon = true;
        var date = new Date();
        date.setTime(date.getTime() + (15*24*60*60*1000));
        document.cookie = "hasWon=true; expires=" + date.toUTCString() + "; path=/";
        if(diff==1){
            $('.rules__char:not(.rules__char--foe)').addClass('rules__char--hof');
            document.cookie = "isHof=true; expires=" + date.toUTCString() + "; path=/";
        }
        $('.rules__foes').removeClass('locked');
        resetSplash();
        hideShow('.home, .home > *, .rules, .splash, .fight, .fight__round, .fight__ui, .fight__btns, .fight__imgs', '.splash--round--2, .jsDeleteCookies');
        setTimeout(()=>{
            hideShow('.fight__img');
            animText();
        }, 3000)
    }

    function rulesShow(e){
        if(e.data.show){
            $('.rules').scrollTop(0);
            hideShow(null, '.rules');
        }else{
            hideShow('.rules', null);
        }
    }

    function goBackHome(){
        hideShow('.rules, .splash, .selectChar, .drawPhase, .fight, .home > *', '.home');
        animHome();
    }

    function hideShow(hide, show){ // 2x str '.maClasse1, .maClasse2'
        if(hide){
            $(hide).addClass('hidden');
        }
        if(show){
            $(show).removeClass('hidden');
        }
    }

})(jQuery);
