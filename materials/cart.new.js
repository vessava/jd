/**
 * 满返中的套装
 */
SkuItemType.PacksOfManFanPacks = 24;
/**
 * 满赠中的套装
 */
SkuItemType.PacksOfManZengPacks = 29;

/*
 * 购物车 modify by tongen@ date 2014.11.18
 */
define(function(require, exports, module) {
    // 引入资源库
    var area = require('jdf/1.0.0/ui/area/1.0.0/area');
    var switchable = require('jdf/1.0.0/ui/switchable/1.0.0/switchable');
    var dialog = require('jdf/1.0.0/ui/dialog/1.0.0/dialog');
    var login = require('jdf/1.0.0/unit/login/1.0.0/login');
    var notify = require('jdf/1.0.0/unit/notif/1.0.0/notif');
    var gotop = require('jdf/1.0.0/ui/gotop/1.0.0/gotop');
    var tips = require('jdf/1.0.0/ui/tips/1.0.0/tips');
    var trimpath = require('jdf/1.0.0/unit/trimPath/1.0.0/trimPath');
    var lazyload = require('jdf/1.0.0/ui/lazyload/1.0.0/lazyload');
    var fixable = require('jdf/1.0.0/ui/fixable/1.0.0/fixable');
    var jsontool = require('jdf/1.0.0/unit/json/1.0.0/json');
    
    var cartObj = {
        iurl: PurchaseAppConfig.Domain,
        myfridge:9527,
        t:$('#container').attr('t'),
        orderInfoUrl: this.iurl + "/gotoOrder.action",
        alamp:null,
        cartSidebar:null,
        ivender:0,
        ipLocation:'',
        outSkus: $('#outSkus').val() || '',
        allSkuIds: $('#allSkuIds').val() || '',
        businessLinkSkuIds: $('#businessLinkSkuIds').val() || '',
        unfindStockState : $('#isNoSearchStockState').val()=="1" ? true : false,
        ssgDowngrade : function() {return $('#isSsgdg').val() == "1";},
        favoriteDowngrade : function () { return $('#isFavoriteDowngrade').val() == "1";},
        priceNoticeDowngrade : function() { return $('#isPriceNoticeDowngrade').val() == "1";},
        installmentDowngrade : function() { return $('#isInstallmentDowngrade').val() == "1";},
        headNoticeDg : function() { return $('#headNoticeDg').val() == "1";},
        unmarketDowngrade : function() {return $('#isUnmarketDowngrade').val() != "1";},
        giftServiceDowngrade : function() {return $('#isGiftServiceDowngrade').length>0 && $('#isGiftServiceDowngrade').val() != "1";},
        freightDowngrade : function() {return ($('#isNoXzyf').length == 0 || $('#isNoXzyf').val() == "1");},
        freightCouDowngrade : function() {return $('#isNoXzyfCd').val() == "1";},
        overseaAreaDowngrade : function() {return $("#isOadg").length>0 && $("#isOadg").val() != "1";},
        limitInfoDowngrade : function() {return ($('#isLdg').length == 0 || $('#isLdg').val() == "1");},
        plusProbationDowngrade : function() {return ($('#isPsydg').length > 0 && $('#isPsydg').val() == "1");},
        optimalPromoDowngrade : function() {return ($('#isOpdg').length == 0 || $('#isOpdg').val() == "1" || this.isOptimalLimitDowngrade("limitOpdgThreshold"));},
        preSellDowngrade : function() {return ($('#isYydg').length == 0 || $('#isYydg').val() == "1");},
        flashPurchaseDowngrade : function() {return ($('#isSgdg').length == 0 || $('#isSgdg').val() == "1");},
        carModelDowngrade : function() {return ($('#iscardg').length == 0 || $('#iscardg').val() == "1");},
        toOrderDowngrade : function() {return ($('#istoOrder').length == 0 || $('#istoOrder').val() == "1");},
        isJcLo : function() {return ($('#isJcLo').val() == "1");},
		isCartAsyncRequest : function(requestStr) {return ($('#' + requestStr).val() == "1");},
		isOptimalLimitDowngrade : function(requestStr) {return ($("[calop]").length>$('#' + requestStr).val());},
        freshFreightConfig : null,
        notFreshFreightConfig : null,
        freshFreight : null,
        notFreshFreight : null,
        coudanDialog : null,
        pSellEve : [],
        smartTipShow : false,
        opPromoShow : true,
        firstOp : true,
        clickOp : false,
        opParam : null,
        depreNoticeDone : false,
        installNoticeDone : false,
        showDepreNotice : false,
        showInstallNotice : false,
        
        getStoreUrl : function(skuNum) {
            var locationId = this.ipLocation;
            if(!locationId || !skuNum){
            	return undefined;
            }
            locationIdArray = locationId.split("-");
            locationId = locationIdArray[0] + "," + locationIdArray[1] + "," + locationIdArray[2] + "," + (locationIdArray[3]||0);
            var pduid="";
            var pin= "";
            var c="";
            try {
                pin=readCookie("pin");
                pduid=$.jCookie("__jda").split(".")[1];
            } catch(e){}
            var coord = $('#coord').val();
			if (this.isCartAsyncRequest("isSsdgHttp")) {
            	return url = "//fts.jd.com/areaStockState/mget?ch=1&skuNum="+skuNum+"&area="+locationId +
            	"&coordnate=" + coord + "&callback=?";
        	} else {
        		if(coord){
                	c = "1,"+coord;
                }
        		return url = "//cart.jd.com/stock.action?skuNum="+skuNum+"&area="+locationId+"&coord="+c
                +"&r="+Math.random()+"&callback=?";
        	}
        },
        
        getApiData: function(func, body) {
        	return {
            	t: new Date().getTime(),
            	client: "pc",
            	appid: "pc_cart",
            	functionId: func,
            	body: JSON.stringify(body)
            };
        },
        
        init: function(){
        	this.toggleAll();
        	this.initPurchaseConfig();
            // 配送地址
            this.initArea();
            // 绑定事件
            this.bindCartEvent();
            // 库存状态处理
            this.updateStoreState();
            // 显示降价通知和白条免息
            this.showDepreciate();
            this.showInstallment();
            // 扩展属性：礼品购、闪购、国际站等
            this.loadIconsFromExt();
            // 延保信息
            this.initYanBao();
            // 初始化京东国际的按钮
            this.initJInitButtons();
            // 改变全部商品下的下划线
            this.resetUnderline();
            // 初始化吸底
            this.ceilingAlamp();
            // 更新店铺信息
            this.getVenderInfo($("#venderIds").val());
            // 更新店铺咚咚信息
            this.getDDInfo($('#isNoDD').val(), $("#venderIds").val());
            // 更新店铺优惠券信息
            this.getVenderCoupons($('#isNoCoupon').val(), $("#venderIds").val());
            // 更新店铺运费信息  产品需求，下掉Pop运费信息
//            this.updateVenderFreight($('#isNoVenderFreight').val(), $("#venderFreightIds").val(), $("#venderTotals").val(), $("#uclass").val(), null);
            // 落地配服务
            this.getDeliveryName();
            // 滞留商品营销信息
            this.loadProductUnmarket();
            this.overseasLocTips();
            // Loc到店服务的门店信息
            this.loadShopInfo($('#isMdxxdg').val());
            this.getOptimalPromo();
            this.showPreSellInfo();
            // pop汽车增值服务
            this.initcarService();
            this.initCarModelService();
        },
        initPurchaseConfig: function(){
        	PurchaseAppConfig.JD_VENDERID = 8888;
        	PurchaseAppConfig.tofix = function (num, fix){// 保留fix小数位
				return new Number(num).toFixed(fix == 0 ? 0 : fix || 2);
			};
			PurchaseAppConfig.add = function (num1, num2, fix){// 保留精度相加
				num1 = num1 || 0;
				num2 = num2 || 0;
				fix = fix || 2;	// 默认精度两位
				var digit = Math.pow(10, fix);
				return (digit * num1 + digit * num2) / digit;
			};
			PurchaseAppConfig.sub = function (num1, num2, fix){// 保留精度相减
				num1 = num1 || 0;
				num2 = num2 || 0;
				fix = fix == 0? 0 : (fix || 2);// 默认精度两位
				var digit = Math.pow(10, fix);
				return parseFloat(PurchaseAppConfig.tofix((digit * num1 - digit * num2) / digit, fix));
			};
        },
        
        removeSsg : function() {
        	try{
        		$(".c-item").each(function() {
        			if ($(this).html() == "随手购") {
        				$(this).remove();
        			}
        		});
        		$("#walkBuy-products").remove();
        	}catch(e){}
        },
        
        // 取消小红点
        cancelDot: function(){
        	try{
        		jQuery.ajax({
        			type : "Post",
        			url : this.iurl + '/dchange.action',
        			data : {t:this.t,d : "0",random : Math.random()}
        		});
        	}catch(err){}
        },
        
        /**
		 * 判断全球售地址
		 */
        isOverseasLoc: function(){
        	if ($('#overseasLoc').val() == 1) {
        		return true;
        	}
        	return false;
        },
        /**
		 * 初始化全球售tips
		 */
        overseasLocTips: function(){
        	
			// 礼品购、延保 问号tips
        	var gti = $('.global-tips-icon');
        	if (gti.length != 0) {
        		$(gti).tips({
        			type:'hover',
        			hasArrow:true,
        			hasClose:false,
        			align:['top','left'],
        			autoWindow:true,
        			tipsClass:'global-tips'
        		});
        	};
        	// 已选延保tips
        	var sng = $('.service-name-global');
        	if (sng.length != 0) {
        		$(sng).tips({
        			type:'hover',
        			hasArrow:true,
        			hasClose:true,
        			align:['bottom','left'],
        			autoWindow:true,
        			tipsClass:'global-tips4longcont'
        		});
        	};
        	// 已选包装tips
        	var sng = $('.giftbox-name-global');
        	if (sng.length != 0) {
        		$(sng).tips({
        			type:'hover',
        			hasArrow:true,
        			hasClose:true,
        			align:['bottom','left'],
        			autoWindow:true,
        			tipsClass:'global-tips4longcont'
        		});
        	}
        },
        // 绑定事件：全部改为delegate
        bindCartEvent: function(){
            var me = this;
            // 促销信息hover效果
			$('.p-price-new').delegate('', 'hover', function(){
                $('.p-price-new').tips({
				  type: 'hover',
				  trigger: '.pro-tiny-tip',
				  align: ['top'],
				  hasClose: false,
				  tipsClass: 'pro-tiny-tip-style',
				  callback: function(trigger, obj) {
					$(obj).offset({left:$(obj).offset().left-10});
				  }
				});
            });
			
            // 购物车页面的登陆按钮
            $('.nologin-tip').delegate('a', 'click', function(){
                me.goToLogin();
            });

            // 删除商品 打开是否删除浮层
            $('.cart-warp').delegate('.cart-remove', 'click', function(){
                me.removeSkuDlg($(this));
            });

            // 删除商品 浮层上删除、是否批量操作
            $('body').delegate('.select-remove', 'click', function(){
                me.remove($(this), $(this).attr('data-batch') || false);
                $.closeDialog();
            });

            // 删除商品 浮层上移到我的关注、是否批量操作
            $('body').delegate('.re-select-follow', 'click', function(){
            	var bbatch = $(this).attr('data-batch') || false;
            	if(bbatch && $(".item-selected").length>50){
            		$.closeDialog();
            		me.showAlertDlg('最多只能选50件商品！');
                	return;
            	}
                me.follow($(this).attr('data-bind'), bbatch, null, $(this).attr('selectstate'));
                $.closeDialog();
            });

            // 移到我的关注
            $('.cart-warp').delegate('.cart-follow', 'click', function(){
                me.followSkuDlg($(this));
            });

            // 加到我的关注
            //$('.cart-warp').delegate('.add-follow', 'click', function(){
           //     me.followSkuOnly($(this));
           // });

            $('body').delegate('.select-follow', 'click', function(){
                me.follow($(this).attr('data-bind'), $(this).attr('data-batch') || false, $(this).attr('data-more'), $(this).attr('selectstate'));
                $.closeDialog();
            });

            $('body').delegate('.cancel-follow', 'click', function(){
                $.closeDialog();
            });

            // 批量删除
            $('#cart-floatbar').delegate('a.remove-batch', 'click', function(){
                me.removeSkuDlg($(this));
            });

            // 批量清除下柜的商品
            $('#cart-floatbar').delegate('a.J_clr_nosale', 'click', function () {
                me.removeNosellSkuDlg($(this), true);
            });
            
            // 批量清除下柜的商品浮层上确定按钮
            $('body').delegate('.re-select-nosell', 'click', function(){
                var removegiftboxids = [], giftSkuIdMap = {};
                $(".cart-remove-nosell").each(function(i,o){
                    var tempId = $(o).attr('id').split("_")[2];
                    removegiftboxids.push(tempId);
                    giftSkuIdMap[tempId] = true;
                });
                me.removeGiftCartBox(removegiftboxids.join(","), giftSkuIdMap);
                me.updateCartInfo(me.iurl + '/batchRemoveUnusableSkusFromCart.action', '', null, function(){
                    $.closeDialog();
                });
            });
            
            // 批量清除下柜的商品浮层上取消按钮
            $('body').delegate('.re-cancel-nosell', 'click', function(){
                $.closeDialog();
            });
            
            // 删除下柜商品 打开是否删除浮层
            $('.cart-warp').delegate('.cart-remove-nosell', 'click', function(){
                me.removeNosellSkuDlg($(this), false);
            });
            
            // 删除下柜商品 删除浮层的确定按钮
            $('body').delegate('.select-nosell-remove', 'click', function(){
                me.removeNosellProduct($(this), function(){
                    $.closeDialog();
                });
            });
            
            // 删除下柜商品 删除浮层的取消按钮,换区弹窗的“知道了”按钮
            $('body').delegate('.cancel-nosell-remove,.replaceItems', 'click', function(){
                $.closeDialog();
            });

            // 批量移到
            $('#cart-floatbar').delegate('a.follow-batch', 'click', function(){
                me.followSkuDlg($(this));
            });

            // 删除赠品
            $('.cart-warp').delegate('.remove-gift', 'click', function(){
                me.removeGift($(this).attr('id'));
            });

            // 商品自带赠品无货时删除
            $('.cart-warp').delegate('.remove-selfgift', 'click', function(){
                me.removeSelfgift($(this).attr('id'));
            });

            // 商品自带赠品有货时还原
            $('.cart-warp').delegate('.resume-selfgift', 'click', function(){
                me.resumeSelfgift($(this).attr('id'));
            });

            // 咚咚
            $('.cart-warp').delegate('.btn-im,.btn-imoff', 'click', function(){
            	me.startDDClient($(this).attr('_vid'));
            });

            // 领取优惠券
            $('.cart-warp').delegate('.coupon-btn', 'click', function(){
            	me.receiveCoupon(this.id);
            });
            
            // 关闭合并提示信息
            $('.full-tip').delegate('.cls-btn', 'click', function(){
            	$('.full-tip').hide();
            });

            $('.cart-warp').delegate('.J_cpitems,.zyc-ico', 'click', function () {
                $(this).closest('.p-coupon-item').siblings().children('.cpitems').addClass('hide');
                $(this).closest('.p-coupon-item').siblings().children('.coupon-msg-curr').removeClass('coupon-msg-curr').addClass('coupon-msg');
                if($(this).closest('.coupon-msg-curr').length){
                    $(this).closest('.coupon-msg-curr').removeClass('coupon-msg-curr').addClass('coupon-msg').siblings('.cpitems').addClass('hide');
                    return;
                }
                $(this).closest('.coupon-msg').removeClass('coupon-msg').addClass('coupon-msg-curr').siblings('.cpitems').removeClass('hide');
            });
            // 滞留商品营销更多点击事件
            $('.cart-warp').delegate('.unmarket-more', 'click', function () {
                me.clearDialog();
                var umDialog = $(this).next('.unmarket-more-dialog');
                umDialog.hasClass('hide') ? (umDialog.removeClass('hide').offset({
                    top: $(this).offset().top + 22,
                    left: $(this).offset().left - 160
                }),($(this).closest('.item-item').parent().css('z-index', 3), $(this).closest('.item-item').css('z-index', 20))) : umDialog.addClass('hide');
            });
            // 去凑单绑定事件
            $('.cart-warp').delegate("div.item-header>div.f-txt>a[id^='coudan_promo_']", "click", function(){
                var cparr = $(this).attr("id").split("_");
                if (cparr.length==3 && cparr[2]!="") {
                    if ($("#select-skus_promo_" + cparr[2]).length>0) {
                        window.open("//search.jd.com/Search?activity_id=" + cparr[2] + "&activity_sku="+$("#select-skus_promo_" + cparr[2]).val());
                    } else {
                        window.open("//search.jd.com/Search?activity_id=" + cparr[2]);
                    }
                }
            });
            // plus95折余额hover
            if (Number(this.t) != Number(this.myfridge)) {
            	$('body').delegate('.plus-95-tips', 'mouseover', function () {
                    $('.pro-tiny-tip-style-plus95').show();
                });
                $('body').delegate('.plus-95-tips', 'mouseleave', function () {
                    $('.pro-tiny-tip-style-plus95').hide();
                });
            }
            
            // 到货通知
            notify({el:$('.cart-notify')});

            // 选择一个商品、选择多个商品
            this.bindCheckEvent();

            // 增减商品数量
            this.bindskuNumEvent();

            // 满赠、满减
            this.initGiftEvent();

            // 重新购买
            this.initRebuyEvent();

            // 促销优惠
            this.initPromotionEvent();
			
			// plus价格切换
            this.initPlusPriceSwitchEvent();

            // 优惠券
            this.initCouponsEvent();
            
            // 京豆优惠
            this.initJbeanEvent();

            // 选择京东服务
            this.initJdServices();
            
            // 专属定制信息
            this.initHandtailorEvent();

            // 购买礼品服务
            this.initGiftcardEvent();

            // 底部：选中商品展开收起。
            this.initShowListEvent();

            // 无货找相似
            this.initNoSockSimilar();

			// 切换PC购物车和医药城购物车页签鼠标事件
            if(me.t  !=  me.myfridge){
            	// 我的冰箱屏蔽页签切换鼠标事件
            	this.initChangeBookMark();
            }
            // 赠品池
            this.initGiftPoolEvent();

            // 去结算：普通
            $('.cart-warp').delegate('.submit-btn', 'click', function(){
            	var binter = ($(this).attr('data-bind') == 2) ? true : false;
                me.gotoBalance(binter);
            });

            // 去结算：普通
            $('.cart-warp').delegate('.common-submit-btn', 'click', function(){
                me.gotoBalance();
            });

            
            // 去结算：京东国际
            $('.cart-warp').delegate('.jdInt-submit-btn', 'click', function(){
                me.gotoBalance(true);
            });
            
            // 去结算：京东国际
            $('.cart-warp').delegate('.jdInt-submit-btn-hd', 'click', function(){
            	me.gotoBalance(true);
            });

            // 清除页面上的窗口
            $('body').delegate('#container', 'click', function(event){
                var tg = event.target;

                // 目标不是窗口
                var notPromotionTip = $(tg).hasClass('promotion-tit') || !$(tg).hasClass('promotion-tips') && !$(tg).parents('.promotion-tips').length;
                var notServiceTip = $(tg).hasClass('jd-service-tit') || !$(tg).hasClass('jd-service-integration') && !$(tg).parents('.jd-service-integration').length;
                var notSelectTip = !$(tg).parents('.selected-item-list').length;
                var notGiftBox = !$(tg).parents('.gift-box').length;
                var notSimilar = !$(tg).hasClass('nogood-similar') && !$(tg).hasClass('smart-similar') && !($(tg).closest('.cart-similar:visible').length>=1) || $(tg).hasClass('cs-tit');
                var notGift3cBox = !$(tg).hasClass('gift-edit') && !($(tg).closest('.gift-3c-main:visible').length>=1);
                var notMultiGift3cBox = !$(tg).hasClass('gift-edit') && !($(tg).closest('.gift-3c-main-expan:visible').length>=1);
                var notUnmarket = !($(tg).hasClass('unmarket-more') || $(tg).closest('.unmarket-more-dialog:visible').length >= 1);
                var notGiftCardbox = !($(tg).hasClass('gift-packing') || $(tg).closest('.giftcardbox-dialog:visible').length >= 1);
                var notHandtailorBox = !$(tg).hasClass('jd-recustomize') && !($(tg).closest('.recustomize-dialog:visible').length>=1);
                // 价格切换弹层
                var notPriceSwitchbox = $(tg).hasClass('plus-switch') || !$(tg).hasClass('plus-switch') && (!$(tg).parents('.price-switch-tips').length || $(tg).parents('.price-switch-now').length > 0 || $(tg).hasClass('price-switch-now'));
                /** ** 无货找相似 b 标签点击特殊处理 start **** */
	            if($(tg).is('b') && ($(tg).closest('.nogood-similar').length>=1 || $(tg).closest('.smart-similar').length>=1)){
	                return false;
	            }
	            if($(tg).is('b') && $('.cart-similar:visible').length>=1){
	                me.hideAllStockSimilar();
	                return false;
	            };
	            /** ** 无货找相似 b 标签点击特殊处理 end **** */
                if(!notPromotionTip || !notSelectTip || !notServiceTip || !notGiftBox || !notSimilar || !notGift3cBox || !notUnmarket || !notGiftCardbox){
                    return;
                }

                if(notGift3cBox){
                    $('.gift-3c-title,.gift-3c-main').addClass('hide');
                }
                if(notMultiGift3cBox){
                    $('.gift-3c-main-expan').addClass('hide');
                }
                
                if(notHandtailorBox) {
                	$('.recustomize-dialog').addClass('hide');
                }
                if(notUnmarket) {
                    $('.unmarket-more-dialog').each(function() {
                        $(this).addClass('hide');
                        if(me.isLowIE()){
                            $(this).closest('.item-item').parent().css('z-index', 'auto');
                            $(this).closest('.item-item').css('z-index', 'auto');
                        }
                    });
                }
                if(notSimilar){
                    $('.cart-similar').each(function(){
                        $(this).slideUp(200);
                        if(me.isLowIE()){
                            $(this).closest('.item-item').parent().css('z-index', 'auto');
                            $(this).closest('.item-item').css('z-index', 'auto');
                            $('input[name="checkShop"]').parent().css('z-index', 'auto');
                        }
                    });
                }

                if(notPromotionTip){
                    $('.promotion-tips').each(function(){
                        $(this).slideUp(200);
                        if(me.isLowIE()){
                            $(this).closest('.item-item').parent().css('z-index', 'auto');
                            $(this).closest('.item-item').css('z-index', 'auto');
                        }
                    });
                }

				if(notPriceSwitchbox) {
                  $('.price-switch-tips').slideUp(200);
                }
				
                if(notServiceTip){
                    $('.jd-service-integration').each(function(){
                        $(this).slideUp(200);
                        if(me.isLowIE()){
                            $(this).closest('.item-item').parent().css('z-index', 'auto');
                            $(this).closest('.item-item').css('z-index', 'auto');
                        }
                    });
                }

                // 点击元素外其他地方，收起。
                if(notSelectTip){
                    $('.selected-item-list').hide();
                    $('.amount-sum b').removeClass('down').addClass('up');
                }

                if(notGiftBox){
                    $('.gift-box').each(function(){
                        $(this).hide();
                        if(me.isLowIE()){
                            $(this).parent().css('z-index', 'auto');
                        }
                    });
                }
                // 购买礼品服务下拉框收起
                if(notGiftCardbox) {
                    $('.giftcardbox-dialog').each(function () {
                        // $(this).addClass('hide');
                        $(this).slideUp(200);
                    });
                }
            });

            // 店铺包邮推荐
            this.initVenderRecommendEvent();

            // 提示 不含运费和服务费
            $('.price-tips').hover(function(){
                $(this).next().show().css('left', ($(this).position().left - 50)+'px');
            }, function(){
                $(this).next().hide();
            });

            // pop和fbp运费弹层
            $('.cart-warp').delegate('.fw-info-main-fresh', 'mouseenter', function(){
		    	me.doLog('cart_201610202','4');
		    	$(this).closest('.fw-info-main-fresh').find('.fw-info-box-new').show();
		    	$(this).click();
		    });

		    $('.cart-warp').delegate('.fw-info-main-fresh', 'mouseleave', function(event){
		    	if(event.toElement && !$(event.toElement).hasClass('fw-info-box-arrow')){
		    		$(event.target).closest('.fw-info-main-fresh').find('.fw-info-box-new').hide();
		    		return;
		    	}
		    	// firefox bug
		    	if(!event.toElement && !$(event.relatedTarget).hasClass('fw-info-box-arrow')){
		    		$(event.target).closest('.fw-info-main-fresh').find('.fw-info-box-new').hide();
		    		return;
		    	}
		    });

		    $('.cart-warp').delegate('.fw-info-box-new', 'mouseleave', function(){
	    		$(this).hide();
	    	});
		    
		    // 赠品池内tip提示层
            $('.J_gs-info-tips').tips({
                type: 'hover',
                align: ['top'],
                hasClose: false,
                tipsClass: 'gift-tiny-tip-style',
                callback: function(trigger, obj) {
                  $(obj).offset({left:$(obj).offset().left-12});
                }
            });

		    // 最优促销相关
        	$('body').delegate('#promoRelaButton', 'click', function(){
        		$("#J_promotion_toast_cont").remove();
            	$("#J_promotion_toast").remove();
            	$("#cart-list").prepend('<div id="opLoad" class="promotion-toast loading"><b></b><span>正在修改促销</span></div>');
            	me.clickOp = true;
            	me.smartTipShow = false;
            	me.updateCartInfo(me.iurl + '/batchChangePromo.action' ,"promoRela=" + me.opParam);
            });
			$(".cart-warp").delegate("#J_promotion_toast_click","click",function(event){
    			$("#J_promotion_toast").addClass("hide");
    			$("#J_promotion_toast_cont").removeClass("hide");
    			setTimeout(function(){$("#J_promotion_toast").removeClass("hide"),$("#J_promotion_toast_cont").addClass("hide")},5e3);
    		});
    		
    		// 白条和降价通知高亮商品周边
			$(".cart-filter-top-popup a").delegate("","click",function(event){
				$("[" +$(this).attr("t") + "]").each(function() {
					var el = $(this).closest(".item-item");
					if(!el.hasClass("item-item__promotion_active")) {
	    	    		el.addClass("item-item__promotion_active");
	    	    	}
				});
    		});

            // 快速清理
            $(".operation [class='cleaner-opt J_clr_all']").delegate("", "click", function (event) {
                if ($("#isLogin").val() == 0) {
                    me.goToLogin();
                    return;
                }
                require.async("user/lib/cart-cleaner/1.0.0/js/cart-cleaner", function (cartCleaner) {
                    cartCleaner.cartCleaner(null, null, null, null, function () {
                        me.updateCartInfo(me.iurl + '/jcart' , null , '获取购物车失败' , null );
                    });
                });
            });
            
            // 无效专属定制商品重新定制
            $("a[id^=recustomize_]").click(function(){
        		var param = "skuId=" + $(this).attr("skuid") + "&skuUuid=" + $(this).attr("skuuuid") +
        					"&customInfoId=" + $(this).attr("customInfoId");
				jQuery.ajax({
					type  : "GET",
					dataType : "jsonp",
					url  : "//bespoke.jd.com/bespokeAddress/queryBespokeAddress",
					data : param,
					jsonpCallback: "jsonpCall",
					success : function(result) {
						if(result.bespokeUrl) {
							window.location.href = result.bespokeUrl;
						}
					},
					error:function(XMLHttpResponse){
						
					}
				});
            });
            
            // 下柜商品单个删除
            $('.cart-warp').delegate('.J_cart-remove-new', 'click', function(){
                me.removeUnableSkuDlg($(this),false);
            });
            
            // 下柜商品全部删除
            $('.cart-warp').delegate('.J_cart-clear-soldout', 'click', function(){
                me.removeUnableSkuDlg($(this),true);
            });
            
            // 删除全部下柜商品 删除浮层的确定按钮
            $('body').delegate('.J_cart-clear-all', 'click', function(){
                me.updateCartInfo(me.iurl + '/batchRemoveUnusableSkusFromCart.action', '', null, function(){
                    $.closeDialog();
                });
            });
            
            // 删除单个下柜商品 删除浮层的确定按钮
            $('body').delegate('.J_cart-remove-new-single', 'click', function(){
                me.removeUnusableSku($(this), function(){
                    $.closeDialog();
                });
            });
            
            $('body').delegate('.gift-up', 'click', function(){
            	$(this).prevAll().filter('.gift-item').removeClass('hide');
            	$(this).hide();
            	$(this).siblings().filter('.gift-down').css({ 'display': 'flex' });
            });
            
            $('body').delegate('.gift-down', 'click', function(){
            	$(this).prevAll().filter('.gift-hide').addClass('hide');
            	$(this).hide();
            	$(this).siblings().filter('.gift-up').css({ 'display': 'flex' });
            });
        },
        initVenderRecommendEvent: function(){
        	var me = this;
            $('.cart-warp').delegate('.J_order_combined', 'click', function(obj,e){
	                var eObj = this;
	            	require.async('user/cart/js/recommend-combined-201801', function(recommendCombined){
	                    try{
		                    me.cartVenderDialogNew($(eObj).parent(), recommendCombined);
	                    } catch(err){}
	                });
        		}
            );
        },
        
        rebindCartEvent: function () {
        	var me = this;
        	
        	// 赠品池内tips提示层
            $('.J_gs-info-tips').tips({
                type: 'hover',
                align: ['top'],
                hasClose: false,
                tipsClass: 'gift-tiny-tip-style',
                callback: function(trigger, obj) {
                  $(obj).offset({left:$(obj).offset().left-12});
                }
            });
        },

        cartVenderDialogNew: function(el, recommendCombined){
        	var me = this ;
        	var venderSPF = $(el) ;
        	/**
			 * 自营,FBP等续重运费凑单包邮 (选中的sku,小计,差价,总重,差重,差重信息,差重level 99:0 199:1 299:2 399:3 499:4
			 * 50kg+:5,是否只有京东自营,预留参数（FBP店铺名称）,关闭窗口回调,点击加入购物回调)
			 */
        	if (venderSPF.hasClass("shop-freight")) {
    			recommendCombined.getRecommendCombined4Fresh(
    					me.notFreshFreight.have ? {skus:me.notFreshFreight.skuIds, totalPrice:me.notFreshFreight.totalPrice, diffPrice:me.notFreshFreight.needPrice, 
	        				totalWeight:me.notFreshFreight.totalWeight, diffWeight:me.notFreshFreight.needWeight, 
	        				weightInfoTitle: me.notFreshFreight.comments, diffLevel:me.notFreshFreight.diffLevel, isOnlyJD: me.notFreshFreight.isOnlyJD, shopnameStr: ''} : null,
	        			me.freshFreight.have ? {skus:me.freshFreight.skuIds, totalPrice:me.freshFreight.totalPrice, diffPrice:me.freshFreight.needPrice, 
	        				totalWeight:me.freshFreight.totalWeight, diffWeight:me.freshFreight.needWeight, 
	        				weightInfoTitle: me.freshFreight.comments, diffLevel:me.freshFreight.diffLevel, isOnlyJD: me.freshFreight.isOnlyJD, shopnameStr: ''} : null,
	        			null,
		            	function(pid, e){me.jGate(pid, 1, 1, 0, 0, function(){
		            		me.coudanDialog = e;
		            		$('.ocm-op-btns').after('<div class="addsucc-tips"><i></i><span>已成功加入购物车</span></div>');
				            setTimeout(function(){$('.addsucc-tips').remove();}, 800);
		            	});
	        	}, me.notFreshFreightConfig.configs, me.freshFreightConfig.configs);
        	} else {
        		var pin = readCookie("pin");
        		var venderId = venderSPF.attr("venderId");
	        	var shopId = $('#venderId_' + venderId).attr("shopId");
	        	var freight = venderSPF.attr("venderFreight") ;
	        	var callbackParam = "venderId="+venderId;
        		/**
				 * pop凑单推荐窗口，展示推荐位 pin 用户pin checkedSkuIds 选中的商品id venderId 店铺id shopId 店铺id
				 * totalPrice 店铺小计金额 freeShippingPrice pop店铺免运费最小金额 freight 运费金额 function1 关闭窗口回调
				 * function2 添加购物车回调
				 */
                recommendCombined.getPOPRecommendCombined(pin, venderSPF.attr("checkedSkuIds"), venderId, shopId,
        			venderSPF.attr("totalPrice"), venderSPF.attr("freeShippingPrice"), freight, null,
    				function(pid,e){ 
	        			me.jGate(pid, 1, 1, 0, 0, function(result){
	        				me.refreshVenderDialog(e, result, venderSPF);
	        			}, callbackParam);
    				}
                );
        	}
        },
        refreshVenderDialog: function(e, result, venderSPF){
			e.freshPrice(result.modifyResult.venderTotal, venderSPF.attr("freeShippingPrice"));
			$('.ocm-op-btns').after('<div class="addsucc-tips"><i></i><span>已成功加入购物车</span></div>');
            setTimeout(function(){
                $('.addsucc-tips').remove();
            }, 800);
        },
        refreshCoudanDialog: function(){
        	if (this.coudanDialog) {
    			if (this.notFreshFreight.have) {
    				this.coudanDialog.freshPriceAndWeight(this.notFreshFreight.totalPrice, this.notFreshFreight.needPrice, this.notFreshFreight.totalWeight,
		            	this.notFreshFreight.needWeight, this.notFreshFreight.comments, this.notFreshFreight.diffLevel, this.notFreshFreight.isOnlyJD, '', 'normal');
    			}
    			if (this.freshFreight.have) {
    				this.coudanDialog.freshPriceAndWeight(this.freshFreight.totalPrice, this.freshFreight.needPrice, this.freshFreight.totalWeight,
			            this.freshFreight.needWeight, this.freshFreight.comments, this.freshFreight.diffLevel, this.freshFreight.isOnlyJD, '', 'fresh');
    			}
	            this.coudanDialog = null;
        	}
        },
        
        // 异步获取店铺的信息
        getVenderInfo: function(venderIds) {
            var me = this;
            function resetVender(venderIds){
                if(!venderIds){
                    return;
                }
                var venders = venderIds.split(",");
                var vender;
                for(var i=0, l=venders.length; i<l; i++) {
                	vender = $("#venderId_" + venders[i]);
                    vender.html(vender.find("em")).append("第三方商家").attr("href", "javascript:;").attr("target", "_self");
                }
            }
            var url = this.iurl + "/getVenders.action";
        	var data = {t: this.t, venderIds: venderIds, random: Math.random()};
        	if (this.isCartAsyncRequest("isVenderAsyc")) {
        		url = "//api.m.jd.com/api";
        		data = this.getApiData("pcCartSOA_vender_getVenders", data);
        	}
            jQuery.ajax({
            	url: url,
            	type: "POST",
                dataType: "json",
                xhrFields: {
                	withCredentials: true
                },
                crossDomain: true,
                data: data,
                success: function(result) {
                	if (me.isCartAsyncRequest("isVenderAsyc")) {
                		if (result && result.code == 1) {
                			result = result.resultData;
                		} else {
                			result = null;
                		}
                	} else {
                		result = result.sortedWebVenderResult;
                	}
                    if(result && result.success){
                        var popinfos = result.orderPopInfos;
                        var len = popinfos && popinfos.length || 0;
                        if(!len){
                            resetVender(venderIds);
                        }
                        for(var i = 0; i < len; i++) {
                            var info = popinfos[i];
                            var el = $("#venderId_" + info.venderId);
                            if(info.venderType== 110){//info.venderId == 603837 || info.venderId== 663284 || 
                            } else if (info.htGoodShop) {
                            	el.html('<em class="haitun-icon"></em>');
                            } else {
                            	info.goodShop ? el.html('<em class="good-pop-icon"></em>') : el.html(el.find("em"));
                            }
                            el.append(info.shopName || "第三方商家").attr("href", info.shopUrl || 'javascript:;');
                            if(info.shopUrl){
                                el.attr('target', '_blank');
                            }
                            el.attr('shopId', info.shopId);
                        }
                    } else{
                        resetVender(venderIds);
                    }
                },
                error:function(XMLHttpResponse ){
                	resetVender(venderIds);
                }
            });
        },

        // 异步获取店铺咚咚的信息
        getDDInfo: function(isNoDD,venderIds) {
        	$(".btn-im,.btn-imoff").remove();
        	if(isNoDD == 0){
                jQuery.ajax({
                    type  : "POST",
                    dataType : "json",
                    url   : PurchaseAppConfig.ddDomain + '/checkChat?callback=?',
                    data  : {venderList : venderIds, random : Math.random()},
                    success : function(result) {
                    	$(".btn-im,.btn-imoff").remove();
                    	if(result && result.length){
                    		for(var i=0,length=result.length; i<length; i++){
                        		var shop = result[i];
                        		switch (shop.code){
                        			case 1:// 客服在线
                        				$("#venderId_"+shop.venderId).after("<a class='btn-im' _vid='"+shop.venderId+"' href='javascript:;' clstag='pageclick|keycount|cart__201503041|4'>联系客服</a>");
                        				break ;
                        			case 3:// 客服离线，请留言
                        				$("#venderId_"+shop.venderId).after("<a class='btn-imoff' _vid='"+shop.venderId+"' href='javascript:;' clstag='pageclick|keycount|cart__201503041|4'>联系客服</a>");
                        				break ;
                        			case 0:// 没有开通在线客服
                        				break ;
                        		}
                        	}
                    	}
                    },
                    error:function(XMLHttpResponse){
                    }
                });
        	}
        },
               
        /**
		 * 是否有优惠券
		 */
        getVenderCoupons: function(isNoCoupon, venderIds) {
        	$("span[name^='J_zyshop_']").remove();
        	$("span[name^='J_vendershop_']").remove();
        	if ($("#vender_8888").length > 0) {
        		venderIds += venderIds? ",8888" :"8888";
        	} 
            if(isNoCoupon == 1 || !venderIds) return; 
            var skuCvid = $('#couponParam').val();
            if(!skuCvid) return;
            jQuery.ajax({
            	type: "POST",
            	async : true,
            	dataType : "json",
            	url  : this.iurl + '/getCouponNums.action',
            	data : {skuCvid : skuCvid, random : Math.random(), t : this.t},
            	success : function(result) {
            		$("span[name^='J_zyshop_']").remove();
            		$("span[name^='J_vendershop_']").remove();
            		result = result.couponResult;
            		if(result && result.success){
            			var couponCount = result.couponCount;
            			if (couponCount) {
            				for(var i in couponCount){
            					var vo = couponCount[i];
            					var venderBody = $("#vender_"+ vo.venderId);
            					if(venderBody.length && vo.count > 0){
            						if (vo.venderId == 8888) {
            							venderBody.find(".shop-txt").after('<span class="shop-coupon" name="J_zyshop_8888"><a class="shop-coupon-btn" id="J_zypromo_btn" href="javascript:;" clstag="pageclick|keycount|201508251|19">优惠券</a>');
            						} else {
            							venderBody.find(".shop-txt").after('<span class="shop-coupon" name="J_vendershop_'+vo.venderId+'"><a class="shop-coupon-btn" id="coupon_'+vo.venderId+'" href="javascript:;" clstag="pageclick|keycount|201508251|7">优惠券</a></span>');
            						}
            					}
            				}
            			}
            		}
            	},
            	error:function(XMLHttpResponse ){
            		$("span[name^='J_zyshop_']").remove();
            		$("span[name^='J_vendershop_']").remove();
            	}
            });
        },
        
        // 更新店铺运费
        updateVenderFreight: function(isNoVenderFreight, venderIds, venderTotals, uclass, resultCart) {
			// 产品需求，下掉pop运费信息
        	return;
        	var me = this;
        	try{
            	if (me.isOverseasLoc()) {
            		return;
            	}
        		if(isNoVenderFreight == 1) return;
        		var modifyCheckedSkuIds;
        		if(resultCart && resultCart.modifyResult){ // 异步更新product、vender文档结构
        			var modifyResult = resultCart.modifyResult;
        			// 店铺是空的, 或者店铺是自营、全球购、联合店铺, 都不包邮
        			if((!modifyResult.venderTotals && modifyResult.modifyVenderId > 0) || (modifyResult.modifyVenderId == 8888 || modifyResult.modifyVenderId == 8899)){
        				return;
        			}
        			// 联合店铺内商品状态修改，可能包含多家实际商家商品，需全部更新运费
        			if (modifyResult.modifyVenderId < 0) {
        				venderIds = resultCart.venderFreightIds;
            			venderTotals = resultCart.venderTotals;
        			} else {
        				venderIds = modifyResult.modifyVenderId;
            			venderTotals = modifyResult.venderTotals;
            			modifyCheckedSkuIds = modifyResult.checkedSkuIds;
        			}
        		}else if(!venderIds){ // 购物车是空的
        			return;
        		}
        		
        		var html1 = '运费：¥';
        		var html2 = '<span class="ftx-01 ml5">还差¥';
        		var html3 = '免运费</span>';
        		var html4 = '<a href="#none" class="J_order_combined ml5" clstag="pageclick|keycount|201508251|6">去凑单 &gt;</a>';
        		// 异步请求
        		jQuery.ajax({
        			type  : "POST",
        			async : true,
        			dataType : "json",
        			url  : this.iurl + '/getVenderFreight.action',
        			data : "t="+this.t+"&venderIds="+venderIds +"&venderTotals=" +venderTotals+ "&uclass="+uclass + "&locationId=" + this.ipLocation,
        			success : function(result) {
        				result = result.sortedWebVenderResult;
        				if(result && result.success){
        					var popinfos = result.orderPopInfos;
        					var len = popinfos && popinfos.length || 0;
        					for(var i = 0; i < len; i++) {
        						var venderInfo = popinfos[i];
        						var venderEl = $("#shop-extra-r_"+venderInfo.venderId);
        						if (venderEl.length && !venderEl.hasClass("shop-freight") && !venderEl.hasClass("walmart-shop-freight")) {// 自营和fbp不处理
        							var checkedSkuIds = (resultCart && resultCart.modifyResult.modifyVenderId > 0) ? modifyCheckedSkuIds: venderEl.attr("checkedSkuIds");
	        						venderEl.attr("totalPrice", venderInfo.totalPrice);
	        						venderEl.attr("venderFreight", venderInfo.venderFreight);
	        						venderEl.attr("freeShippingPrice", venderInfo.freeShippingPrice);
	        						venderEl.attr("venderId", venderInfo.venderId);
	        						venderEl.attr("checkedSkuIds", checkedSkuIds);
	        						venderEl.attr("freightPattern", venderInfo.freightPattern);
	        						venderEl.attr("venderFreightType", venderInfo.venderFreightType);
	        						if(venderInfo.freightPattern == 1){ // 商家运费模式: 1. 店铺 2. 单品 3.
																		// 店铺和单品混合模式
	        							// 店铺内没有勾选的商品时，不展示文案
	        							if (!venderInfo.totalPrice || Number(venderInfo.totalPrice) == 0) {
	        								venderEl.html("");
	        								continue;
	        							}
	        							if(venderInfo.venderFreight == 0){// 运费是 0
	        								venderEl.html('已免运费 ');
	        							}else if(venderInfo.venderFreightType == 1){// 运费满免类型
	        								if(venderInfo.freightDiff > 0){
	        									var showGo = checkedSkuIds? html4 :'';
                                                if(me.t  ==  me.myfridge){
                                                    showGo = '';
                                                }
	        									var venderFHtml = html1 + venderInfo.venderFreight + html2 + venderInfo.freightDiff + html3 + showGo;
	        									venderEl.html(venderFHtml);
	        								}else if(venderInfo.freeShippingPrice == 0){
	        									venderEl.html('已免运费 ');
	        								}else if(venderInfo.venderFreight > 0){
	        									venderEl.html('购满¥'+ venderInfo.freeShippingPrice +' 已免运费 ');
	        								}
	        							}else if(venderInfo.venderFreightType == 0){// 固定运费
	        								venderEl.html(html1 + venderInfo.venderFreight);
	        							}
	        						}
        						}
        					}
        					
        					// 初始化tips
        					$('.tips-icon').tips({
        	                    type:'hover',
        	                    hasArrow:true,
        	                    hasClose:false,
        	                    width:210,
        	                    align:['top','right'],
        					    autoWindow:true
        					});
        				}
        			},
        			error:function(XMLHttpResponse ){}
        		});
        	}catch(e){
        	}
        },

        /**
		 * 落地配服务
		 * 
		 */
		getDeliveryName: function(mVenderId){
			var noZy = $("#isNoZyDelivery").val() == "1";
			var noPop = $("#isNoPopDelivery").val() == "1";
			if(noZy && noPop)  return;
			var zyData = "";
			var popData = "";
			var deliveryDiv;
			if(mVenderId){ // 局部刷新
				deliveryDiv = $("#vender_" + mVenderId).find('.service-name.service-name-new.service-name-wa[id^="deliveryItem_"]');
			}else{ // 刷新cart
				deliveryDiv = $('.service-name.service-name-new.service-name-wa[id^="deliveryItem_"]');
			}
			$(deliveryDiv).each(function(){
				if ($(this).attr("zy") == "1") {
					if(noZy) return;
					var serviceItemId = $(this).attr("serviceItemId");
					if(serviceItemId != ""){
						zyData = zyData +"{serviceItemId:"+ serviceItemId;
						var templateId = $(this).attr("templateId");
						zyData = zyData +",templateId:"+ (templateId == ""? 0: templateId);
						zyData = zyData +",venderId:"+ $(this).attr("venderId");
						zyData = zyData +",skuId:"+ $(this).attr("skuId");
						zyData = zyData +"},";
					}
				} else {
					if(noPop) return;
					var serviceItemId = $(this).attr("serviceItemId");
					if(serviceItemId != ""){
						popData = popData +"{serviceItemId:"+ serviceItemId;
						var templateId = $(this).attr("templateId");
						popData = popData +",templateId:"+ (templateId == ""? 0: templateId);
						popData = popData +",venderId:"+ ($(this).attr("venderId") ? $(this).attr("venderId") : null);
						popData = popData +",skuId:"+ $(this).attr("skuId");
						popData = popData +"},";
					}
				}
				
			});
			if(zyData != "") {
				zyData = "deliveryItemsStr=[" + zyData.substring(0, zyData.length-1) + "]";
				jQuery.ajax({
					type  : "POST",
					async : true,
					dataType : "json",
					url  : this.iurl + '/getZyDeliveryName.action',
					data : zyData + "&t=" + this.t + "&random=" + Math.random(),
					success : function(result) {
						var dsItems = result.deliveryServiceItems;
						if(dsItems && dsItems.length > 0){
							for(var i = 0; i< dsItems.length; i++){
								var item = dsItems[i];
								var divDelivery = $("div#deliveryItem_"+item.skuId);
								divDelivery.html("【送装服务】"+item.name);
								divDelivery.attr("title",item.name);
							}
						}
					},
					error:function(XMLHttpResponse ){}
				});
			}
			if(popData != "") {
				popData = "deliveryItemsStr=[" + popData.substring(0, popData.length-1) + "]";
				jQuery.ajax({
					type  : "POST",
					async : true,
					dataType : "json",
					url  : this.iurl + '/getPopDeliveryName.action',
					data : popData + "&t=" + this.t + "&random=" + Math.random(),
					success : function(result) {
						var dsItems = result.deliveryServiceItems;
						if(dsItems && dsItems.length > 0){
							for(var i = 0; i< dsItems.length; i++){
								var item = dsItems[i];
								var divDelivery = $("div#deliveryItem_"+item.skuId);
								divDelivery.html("【送装服务】"+item.name);
								divDelivery.attr("title",item.name);
							}
						}
					},
					error:function(XMLHttpResponse ){}
				});
			}
		},

        // 数据刷新有两种：
        // 刷局部：1）单个商品；2）满赠；3）满减
        // 单选、增减数量、
        // 刷购物车：1）刷单个商家 2）刷所有商家
        // 全选、选择地址
        updateCartInfo: function(url, param, errorMessage, callback, showSam){
            var me = this;
			var catchUrl;
			var data = param + "&t=" + me.t + "&outSkus=" + this.outSkus + "&random=" + Math.random() + "&locationId=" + this.ipLocation;
			if (me.isJcLo()) {
				data = data + "&rlk=" + $('#rlk').val();
			}
			if (url == "//cart.jd.com/jcart" && me.isCartAsyncRequest("isJcAsyc")) {
            	url = "//api.m.jd.com/api";
            	catchUrl = "//api.m.jd.com/api/pcCartSOA_sortedCart_jcart";
				data = {t: me.t, outSkus: this.outSkus, random: Math.random(), locationId: this.ipLocation};
				if (me.isJcLo()) {
					data["rlk"] = $('#rlk').val();
				}
				if (param) {
            		var pArr = [];
            		if (param.indexOf("&") != -1) {
            			pArr = param.split("&");
            		} else {
            			pArr.push(param);
            		}
            		var arr = [];
            		for (var i in pArr) {
            			arr = pArr[i].split("=");
            			data[arr[0]] = arr[1];
            		}
            	}
            	data = me.getApiData("pcCartSOA_sortedCart_jcart", data);
            }
            jQuery.ajax({
                type     : "POST",
                dataType : "json",
                url  : url,
                xhrFields: {
                	withCredentials: true
                },
                crossDomain: true,
                data : data,
                success : function(result) {
					if (catchUrl == "//api.m.jd.com/api/pcCartSOA_sortedCart_jcart" && me.isCartAsyncRequest("isJcAsyc")) {
                		if (result && result.code == 1) {
                			result = result.resultData;
                		} else {
                			return;
                		}
            	    }
            	    me.setLogin(result);
                    if(result && result.l == 1){
                        me.goToLogin();
                        return;
                    }
                    result = result.sortedWebCartResult;
                    if(result && result.url){
                        window.location.href= result.url;
                        return;
                    }
                    // 最优促销
                    $("#opLoad").remove();
                    if(result && result.success){
                        if(result.addSkuLimitState == "Add_Item_Fail" ){
                            $.closeDialog();
                            me.showAlertDlg('添加商品失败，已超出购物车最大容量！');
                            return;
                        }
                        var modifyResult = result.modifyResult;
                        if(me.isCartEmpty(modifyResult)){
                            return;
                        }
                        if(modifyResult && !modifyResult.modifyHtml){
                        	if(callback){
                        		callback(result);
                        	}
                        	return;
                        }
                        me.updateCartGoodsInfo(modifyResult);
                        me.updateTotalInfo(result);
                        // 当购物车为空时，刷新当前页面，让其走cart,重新获取页面
                        if(!$('#cart-list').length){
                        	window.location.reload();
                        }
                        if(callback){
                            callback(result);
                        }
                        me.rebindCartEvent();
                        // 库存状态处理
                        me.updateStoreState(result);
                        // 显示降价通知和白条免息
                        me.showDepreciate();
                        me.showInstallment();
                        me.initYanBao();
                        // 扩展属性：礼品购、闪购、国际站等
                        me.loadIconsFromExt(result);
                        me.getVenderInfo(result.venderIds);
                        me.getDDInfo($('#isNoDD').val(), result.venderIds);
						me.getVenderCoupons($('#isNoCoupon').val(), $("#venderIds").val());
						me.cancelDot();
//						me.updateVenderFreight($('#isNoVenderFreight').val(), result.venderFreightIds, result.venderTotals, result.uclass, null);
						// 落地配服务
						me.getDeliveryName();
                        me.loadProductUnmarket();
                        me.showSamDlg(showSam, result);
                        me.overseasLocTips();
                        // 门店信息
                        me.loadShopInfo($('#isMdxxdg').val());
                        me.unbindSmartCartEvent($('#isCssdg').val());
                        me.getOptimalPromo();
                        me.showPreSellInfo();
                        me.initcarService();
                        me.initCarModelService();
                    }else{
                        $("#cart-loading-dialog").hide();
                        if (result) {
                        	var rem=result.errorMessage;
	                        if(rem.indexOf("@_@") != -1){// @_@是后台传值的约定
	                            errorMessage = "商品数量不能大于" + rem.split("@_@")[1] + "。";
	                        }
                        }
                        if(errorMessage){
                            me.showAlertDlg(errorMessage);
                        }
                    }
                },
                error:function(XMLHttpResponse ){
                	// 最优促销
                    $("#opLoad").remove();
                }
            });
        },

        // 选中或去掉一个商品，
        // 对 select 操作(取消或勾选)
        // 对select操作可以处理为一个。
        // 更新商品
        updateProductInfo: function (url,params,errorMessage,callback){
            var me = this;
            jQuery.ajax({
                type : "POST",
                dataType : "json",
                url : url,
                data: params,
                success : function(result) {
            	    me.setLogin(result);
                    if(result && result.l == 1){
                        me.goToLogin();
                        return;
                    }
                    result = result.sortedWebCartResult;
                    if(result && result.success){
                        if(result.addSkuLimitState == "Add_Item_Fail" ){
                            // info = '添加商品失败，已超出购物车最大容量！';
                            $.closeDialog();
                            me.showAlertDlg('添加商品失败，已超出购物车最大容量！');
                            return;
                        }
                        var modifyResult = result.modifyResult;
                        if(modifyResult && (!modifyResult.modifyHtml || modifyResult.auc == 1)){
                        	if(callback){
                        		callback(result);
                        	}
                        	me.updateCartInfo(me.iurl + '/jcart' , null , '获取购物车失败' , null );
                        	return;
                        }
                        me.updateProductGoodsInfo(modifyResult);
                        if(callback){
                            callback(result);
                        }
                        me.updateTotalInfo(result);
                        me.unbindSmartCartEvent(modifyResult.cssdg);
                        me.rebindCartEvent();
                        // 库存状态处理
                        me.updateStoreState(result);
                        // 显示降价通知和白条免息
                        me.showDepreciate();
                        me.showInstallment();
                        me.initYanBao();
                        // 扩展属性：礼品购、闪购、国际站等
                        me.loadIconsFromExt(result);
                        me.getDDInfo(modifyResult.dddg, result.venderIds);
						me.getVenderCoupons(modifyResult.cpdg, $("#venderIds").val());
//						me.updateVenderFreight(modifyResult.vfdg, null, null, result.uclass, result);
						$("#ids").val(result.ids);
						// 落地配服务
						me.getDeliveryName(modifyResult.modifyVenderId);
                        me.loadProductUnmarket();
                        // 门店信息
                        me.loadShopInfo(modifyResult.mdxxdg);
                        me.overseasLocTips();
                        me.getOptimalPromo();
                        me.showPreSellInfo();
                        me.initcarService();
                        me.initCarModelService();
                    }else{
                        // 服务端返回的错误信息
                        $("#cart-loading-dialog").hide();
                        if(errorMessage){
                            me.showAlertDlg(errorMessage);
                        }
                    }
                },
                error:function(XMLHttpResponse){}
            });
        },

        // 更新店铺
        updateVenderInfo: function(url, param, errorMessage, callback, obj, aimnode){
            var outSkus = this.outSkus;
            this.doing = true;
            var me = this;
            jQuery.ajax({
                type : "POST",
                dataType : "json",
                url : url,
                data : param + "&outSkus=" + outSkus + "&random=" + Math.random() + "&locationId=" + this.ipLocation,
                success : function(result) {
                    me.doing = false;
                    me.setLogin(result);
                    if(result && result.l == 1){
                        me.goToLogin();
                        return;
                    }
                    result = result.sortedWebCartResult;
                    if(result && result.success){
                        if(result.addSkuLimitState == "Add_Item_Fail" ){
                            $.closeDialog();
                            me.showAlertDlg('添加商品失败，已超出购物车最大容量！');
                            return;
                        }
                        var modifyResult = result.modifyResult;
                        if(me.isCartEmpty(modifyResult)){
                            return;
                        }
                        if(modifyResult && ((!modifyResult.venderIsEmpty && !modifyResult.modifyHtml) || modifyResult.auc == 1)){
                        	if(callback){
                        		callback(result);
                        	}
                        	me.updateCartInfo(me.iurl + '/jcart' , null , '获取购物车失败' , null );
                        	return;
                        }
                        me.updateVenderGoodsInfo(modifyResult);
                        me.updateTotalInfo(result);
                        if(callback){
                            callback(result);
                        }
                        me.unbindSmartCartEvent(modifyResult.cssdg);
                        me.rebindCartEvent();
                        // 库存状态处理
                        me.updateStoreState(result);
                        // 显示降价通知和白条免息
                        me.showDepreciate();
                        me.showInstallment();
                        me.initYanBao();
                        // 扩展属性：礼品购、闪购、国际站等
                        me.loadIconsFromExt(result);
                        var info = '';
                        if(modifyResult && modifyResult.poolSkuUnique == 1) {
                            info = '购买一件以上时，不享受本次满减。';
                        }
                        if(modifyResult && modifyResult.maxSkuNumInPool > 0) {
                            info = '购买单个商品超过' + modifyResult.maxSkuNumInPool + '件不享受优惠。';
                        }
                        if(result.adMessage){
                            info = result.adMessage;
                        }
                        if(info && $('#' + aimnode).length){
                            info = '<div class="op-tipmsg" style="position:absolute;left:40px;top:100px;z-index:100;display:none;"><span class="s-icon warn-icon"></span>' + info + '</div>';
                            var curnode = $('#' + aimnode).closest('.quantity-form');
                            if(curnode.length){
                                me.showTipInfo(curnode, info, false, true);
                            }
                        }
                        me.getDDInfo(modifyResult.dddg, result.venderIds);
						me.getVenderCoupons(modifyResult.cpdg, $("#venderIds").val());
//						me.updateVenderFreight(modifyResult.vfdg, null, null, result.uclass, result);
						$("#ids").val(result.ids);
						// 落地配服务
						me.getDeliveryName(modifyResult.modifyVenderId);
                        me.loadProductUnmarket();
                        // 门店信息
                        me.loadShopInfo(modifyResult.mdxxdg);
                        me.overseasLocTips();
                        me.getOptimalPromo();
                        me.showPreSellInfo();
                        me.initcarService();
                        me.initCarModelService();
                    }else{
                        $("#cart-loading-dialog").hide();
                        var rem=result.errorMessage;
                        if(rem.indexOf("@_@") != -1){// @_@是后台传值的约定
                            errorMessage = "商品数量不能大于" + rem.split("@_@")[1];
                        }
                        if(errorMessage){
                            me.showAlertDlg(errorMessage);
                        }
                        if($(obj).length){
                            $(obj).val($(obj).attr("id").split("_")[3]);
                        }
                    }
                },
                error:function(XMLHttpResponse ){
                }
            });
        },

        // 局部刷新，更新item数据
        // 更新商品信息
        updateProductGoodsInfo: function(modifyResult){
            if(!modifyResult){
                return false;
            }
            var venderid = modifyResult.modifyVenderId;
            var mid = modifyResult.modifyProductId;
            var id = "#product_promo_" + mid;
            if($(id).length <= 0){
                id = "#product_" + mid;
            }
            $(id).prop('outerHTML', modifyResult.modifyHtml);
            if($("#shop-extra-r_"+venderid).length){
				$("#shop-extra-r_"+venderid).attr("checkedSkuIds",modifyResult.checkedSkuIds); 
				$("#shop-extra-r_"+venderid).attr("totalPrice",modifyResult.venderTotals); 
            }
        },

        // 局部刷新，更新item数据
        // 更新商品信息
        updateVenderGoodsInfo: function(modifyResult){
            if(!modifyResult){
                return false;
            }
            var venderid = modifyResult.modifyVenderId;
            // 店铺为空
            if(modifyResult.venderIsEmpty){
                $('#vender_' + venderid).prop('outerHTML', '');
            } else{
                var venderel = $('#venderId_'+venderid);
                var shopname = venderel.html();
                var shopurl  = venderel.attr("href");
                var shopId  = venderel.attr("shopId");
                var shopdd = venderel.next();
                $('#vender_'   + venderid).prop('outerHTML', modifyResult.modifyHtml);
                $('#venderId_' + venderid).html(shopname);
                $('#venderId_' + venderid).attr("href", shopurl);
                $('#venderId_' + venderid).attr("shopId", shopId);
                $('#venderId_' + venderid).after(shopdd);
            }
        },

        isCartEmpty: function(modifyResult){
            if(!modifyResult){
                return false;
            }
            // 判断店铺是否为空、购物车是否为空
            // 购物车为空
            if(modifyResult.cartIsEmpty){
            	if(this.t != this.myfridge){
                    window.location.href = this.iurl + '/cart?rd=' + Math.random();
                    return true;
            	}else{
            		 window.location.href = this.iurl + '/myfridge.action?rd=' + Math.random();
                     return true;
            	}
            }
        },

        // 局部刷新，更新item数据
        // 更新商品信息
        updateCartGoodsInfo: function(modifyResult){
            if(!modifyResult){
                return false;
            }
            $('#cart-list').prop('innerHTML',modifyResult.modifyHtml);
        },

        // 修改购物车累计信息 (价格、数量、全选状态等)
        updateTotalInfo: function(result){
            if(!result || !result.modifyResult){
                return false;
            }
            var modifyResult = result.modifyResult;
            var totalSkuPrice = modifyResult.totalPromotionPrice || '0.00';
            var finalSkuPrice = modifyResult.finalPrice || '0.00';
            var rePrice = modifyResult.totalRePrice || '0.00';
            var plusDiscountShowStatus = modifyResult.plusDiscountShowStatus || 0;
            var totalParallelDiscount = modifyResult.totalParallelDiscount || '0.00';
            var balanceAmount = modifyResult.balanceAmount || '0.00';
            var selectedCount = modifyResult.selectedCount;
            if(selectedCount == 0){
                totalSkuPrice = '0.00';
                finalSkuPrice = '0.00';
            }
            $(".amount-sum em").html(selectedCount);
            $(".sumPrice em").attr("data-bind", finalSkuPrice).html("&#x00A5;"+ finalSkuPrice);
            $('.number').html(modifyResult.allCount);
            // 底部促销优惠金额动态调整
            var toolbarHtmlStr = '<span class>促销：</span><span class>-¥' + rePrice + '</span >';
            if (modifyResult.plusDiscountShowStatus == 1) {
            	if (Number(this.t) == Number(this.myfridge)) {
            		toolbarHtmlStr = toolbarHtmlStr +'<span class="ml5">PLUS95折：</span>' +
					'<span class>-¥' + totalParallelDiscount + '</span >';
            	} else {
            		toolbarHtmlStr = toolbarHtmlStr +'<span class="ml5">PLUS95折' +
					'<i class="plus-95-tips">' +
					'<div class="pro-tiny-tip-style-plus95" style="z-index: 208; top: -45px; left: -13px;">' +
					'<div class="ui-tips-main">本月剩余优惠额度：¥' + balanceAmount + '</div>' +
					'<span class="ui-tips-arrow" style="z-index:208"></span></div></i>：</span>' +
					'<span class>-¥' + totalParallelDiscount + '</span >';
            	}
            } else if (modifyResult.plusDiscountShowStatus == 2) {
            	toolbarHtmlStr = toolbarHtmlStr + '<span class="ml5">PLUS95折：优惠金额以结算时为准</span>"';
            }
            $("#price-sum-extra-1").html(toolbarHtmlStr);
            $("#price-sum-extra-2").html(toolbarHtmlStr);
            if (Number(this.t) != Number(this.myfridge)) {
	            // plus95折余额hover
	            $('body').delegate('.plus-95-tips', 'mouseover', function () {
	                $('.pro-tiny-tip-style-plus95').show();
	            });
	            $('body').delegate('.plus-95-tips', 'mouseleave', function () {
	                $('.pro-tiny-tip-style-plus95').hide();
	            });
            }
            
            $('#overseaSelectedCount').val(modifyResult.overseaSelectedCount);
            $('#noOverseaSelectedCount').val(modifyResult.noOverseaSelectedCount);
			$('#isShowDepreNotice').val(modifyResult.showDepreNotice);
			$('#isJcLo').val(modifyResult.jcLo);
			$('#rlk').val(modifyResult.rlk);
			this.toggleAll();
            $('#checkedCartState').val(modifyResult.checkedCartState);
            if (modifyResult.currentTime) {
            	$('#currentTime').val(modifyResult.currentTime);
            }
            if (modifyResult.couponParam) {
            	$('#couponParam').val(modifyResult.couponParam);
            }
            this.initJInitButtons();
            // 改变全部商品下的下划线
            this.resetUnderline();
        },

        // 得到库存
        updateStoreState: function(result) {
        	var me = this;
            var ids = result&&result.allSkuIds || this.allSkuIds;// $("#allSkuIds").val();
            var outSkus = result&&result.outSkus || this.outSkus;
            var businessLinkSkuIds = result&&result.businessLinkSkuIds || this.businessLinkSkuIds;
            if (result) {
            	$("#freshTotalPrice").val(result.freshTotalPrice);
            	$("#notFreshTotalPrice").val(result.notFreshTotalPrice);
                $("#walmartTotalPrice").val(result.walmartTotalPrice);
            }
            // 从结算页返回的数据中查找赠品、换购商品无货的状态。
            if(outSkus){
                var outSkusArr = outSkus.split(',');
                $('.remove-gift').each(function(){
                    var _ids = $(this).attr('id').split('_');
                    var _id = _ids[1];
                    for(var i=0,l=outSkusArr.length; i<l; i++){
                        if(outSkusArr[i] == _id){
                            var itemnode = $(this).closest('.item-item');
                            if(!$('.quantity-txt', itemnode).length){
                                $('.quantity-form', itemnode).after("<div class='ac ftx-03 quantity-txt'><span class='ftx-01'>无货</span></div>");
                                itemnode.addClass('item-invalid');
                            }
                            break;
                        }
                    }
                });
            }
            if(this.unfindStockState) {
        		$(".quantity-txt").each(function() {
        			var ss = $(this).attr('_stock');
                    if(!ss){
                        return;
                    }
                    var pnode = $(this).parents('.item-item');
                    ss = ss.split("_");
                    var id = ss[ss.length - 1];
        			var skus = outSkus.split(',');
        			var isOutOfStock = false;
                    for(var i=0,len=skus.length; i<len; i++){
                        if(skus[i] == id){
                            $(this).html("<span class='ftx-01'>无货</span>");
                            // 库存为无货时，置灰背景、不勾选。
                            pnode.addClass('item-invalid');
                            isOutOfStock = true;
                            break;
                        }
                    }
        			if(!isOutOfStock) {
        				$(this).html("有货");
        			}
        		});
        		return;
        	}

            if(!ids){ return; }
            //不需调用库存商品
            var inStockSku = [];
			// 更新主品商品的库存状态
            var updateStockState = function(result) {
            	if(!result) {
                    return;
                }
        		for(var id in inStockSku){
        			result[inStockSku[id]] = {"a" : "33"};
        		}
                var states = result;
				var isBigGoods = function(e){// 大件仓编号
					return e==2 || e==8 || e==9 || e==52 || e==521;
				}
                $(".quantity-txt").each(function() {
                    var ss = $(this).attr('_stock');
                    if(!ss){
                        return;
                    }

                    // 父节点
                    var pnode = $(this).parents('.item-item');
                    var isPnc = pnode.attr('pnc') == "true";// 5g号卡商品
                    var pncs2 = pnode.attr('pncs') == "2";// 失效
                    var noStock = false;// 是否无货

                    ss = ss.split("_");
                    var id = ss[ss.length - 1];
                    for (var skuId in states) {
						var state = states[skuId];
                        if (skuId == id) {
                            var info;
                            switch (state.a) {
                                case "33": info = "有货"; break;
                                case "36":  
                                        if(state.u && state.u == "1"){
                                            info = "有货";
                                        } else {
                                            info = "采购中<a class='tips-i' href='#none' clstag='clickcart|keycount|xincart|cart_skuYuDing' data-tips='商品到货后发货，现在可下单'>&nbsp;</a>";
                                        }
                                        break;
                                case "39":
	                                	if(state.ec && (state.ec == "1" || state.ec == "2")){
	                                        info = "采购中<a class='tips-i' href='#none' clstag='clickcart|keycount|xincart|cart_skuYuDing' data-tips='2-6天发货，现在可下单'>&nbsp;</a>";
	                                    }else{
	                                    	info = "有货";
	                                    }
	                                    break;
                                case "40": info = "有货"; break;
                                default: 
                                		noStock = true;
                                		info = "<span class='ftx-01'>无货</span>";
                                		if(isPnc) {
                                			// 5g号卡商品屏蔽找相似
                                		} else {
                                			info = "<span class='ftx-01'>无货</span>";
                                    		if($('#isNgsdg').val() == 0) {
                                    			var o = $(this).parent().siblings(".p-goods").find(".p-img a");
        		                                if(!o.next().hasClass('p-mask')) // 避免重复添加无货标识
        		                                {
    		                                		o.after('<b class="p-mask"></b><span class="nogood-similar J_nogood_similar" clstag="pageclick|keycount|cart_201610202|68">找相似<b></b></span><div class="cart-similar" name="cs_'+skuId+'"><div class="cs-tit">找相似<b></b></div><div class="cs-cont"><div class="cs-empty"></div></div></div>');
        		                                }
                                    		}
                                		}
                            }
                            // --如果订单返回到购物车,实际商品是无货,则把库存状态强制设置为无货
                            var skus = outSkus.split(',');
                            for(var i=0,len=skus.length; i<len; i++){
                                if(skus[i] == id){
                                	noStock = true;
                                    info = "<span class='ftx-01'>无货</span>";
                                    // 库存为无货时，置灰背景、不勾选。
                                    pnode.addClass('item-invalid');
                                    // $('input[type=checkbox]', pnode).prop('checked',false)
                                    // .attr('disabled', true);
                                    break;
                                }
                            }

                            // 紧急库存显示
                            if(state.c != "-1" && state.c){
                                info = "<span class='ftx-01'>仅剩" + state.c + "件</span>"
                            }

                            // 有货找相似
                            if($('#isCssdg').val() == 0) {
                            	var o = $(this).parent().siblings(".p-goods").find(".p-img a");
                            	var dataType = $(this).closest('.item-item').attr('dt');
	                            if ((state.a == "33" ||  state.a == "36" || state.a == "39" || state.a == "40" || (state.c != "-1" && state.c)) && dataType == 10) {
	                                o.attr("good-similar", skuId);
	                            } else {
	                            	o.removeAttr("good-similar");
	                            }
                            }
                            // 5g号卡失效状态 有货：展示失效文案，不替换
                            if (isPnc && pncs2 && !noStock) {
                            } else if (isPnc && pncs2 && noStock) {
                            	// 5g号卡失效状态 无货：展示无货且失效文案，替换
                            	info = "<span class='ftx-01'>商品无货且号码失效</span>";
                            	$(this).html(info);
                            	var di = $(this).parent().siblings(".p-goods").find(".p-img");
                            	di.find(".p-mask").remove();
                            	di.find(".smart-similar").remove();
                            } else {
                            	// 非5g号卡商品或5g号卡有效，正常展示库存状态，替换
                            	$(this).html(info);
                            }
                            // 合约机商品，无货且绑定号卡失效时，屏蔽号卡重新选号逻辑
                            if (noStock) {
                            	var hyjNode = pnode.find("[hyj]");
                            	if (hyjNode && hyjNode.attr("pnc") == "true") {
                            		var unusable = hyjNode.attr("unusable") == "true";// 是否为不可用（下架）状态
                            		var pncs2 = hyjNode.attr("pncs") == "2";// 失效
                            		var linktype3 = hyjNode.attr("linktype") == "3";// 是否为套餐类型
                            		// 合约机绑定商品失效且未下架，屏蔽重新选号入口
                            		if (pncs2 && !unusable) {
                            			hyjNode.find(".service-ops-global").remove();
                            		}
                            		if (pncs2 && !unusable && !linktype3) {
                            			var nameDom = hyjNode.find(".service-name a")
                                    	nameDom.html("【号卡】号码已失效");
                            		}
                            	}
                            }
							
                            if(state.a == "36" || state.a == "39"){
                                $('.tips-i').tips({
                                    type:'hover',
                                    hasArrow:true,
                                    hasClose:false,
                                    align:['top','left'],
                                    autoWindow:true,
                                    callback: function(){
                                        $('.ui-tips-arrow').css('left', '3px');
                                    }
                                });
                            }

                            // 无货商品处理: 到货通知
                            if (info == "<span class='ftx-01'>无货</span>") {
                                // 暂时不处理，库存状态可能有出入。逻辑保留注释状态。@tongen
                                // pnode.addClass('item-invalid');
                                // $('input[type=checkbox]', pnode).prop('checked',false)
                                // .attr('disabled', true);
                                if(!pnode.find('.cart-notify').length){
                                    var remove = pnode.find(".cart-remove");
                                    if(remove.length){
                                        var rids = remove.attr('id').split('_');
                                        var skuid = rids[2];

                                        var notifyhtml = '<a data-sku="' + skuid + '" data-type="2" href="javascript:void(0);" class="cart-notify" clstag="clickcart|keycount|xincart|cart_daoHuoLogin">到货通知</a>';
                                        remove.after(notifyhtml);
                                    }
                                }
                            }
                            if (!me.freightDowngrade() && !me.isOverseasLoc()) {
	                            var weightSpan = pnode.find(".weight");
	                            if (weightSpan.length) {
		                            if (isBigGoods(state.e)) {
		                            	weightSpan.attr("data","0");
		                            } else if(weightSpan.attr("data") != 0) {
//		                            	weightSpan.html(weightSpan.attr("data") + "kg");
		                            }
	                            }
                            }
                            break;
                        }
                    }
                });
                try{
                	if (!me.limitInfoDowngrade()) {
                		me.fillLimitInfo(ids);
                	}
                }catch(e){};
                try {
                	if (!me.freightDowngrade() && !me.isOverseasLoc()) {
                		me.calWeightFreight();
                	}
                }catch(e){};
            };
            
            // 更新绑定商品的库存状态
            var updateLinkServiceSkuStockState = function(result) {
            	if(!result) {
                    return;
                }
                var states = result;
				for (var skuId in states) {
					var state = states[skuId];
					var linkSkuNode = $("#buslinksku_" + skuId);
					
                    if (linkSkuNode && linkSkuNode.length > 0) {
                    	var unusable = linkSkuNode.attr('unusable') == "true";// 是否为不可用（下架）状态
                    	var pncs2 = linkSkuNode.attr('pncs') == "2";// 失效
                        var noStock = false;// 是否无货
                        var info;
                        // 只需判断无货状态
                        switch (state.a) {
                            case "33":  break;
                            case "36":  break;
                            case "39":  break;
                            case "40":  break;
                            default: 
                            		noStock = true;
                            		info = '<div class="service-ops-global ftx-01">无货&nbsp;</div>';
                            		
                            		
                        }
                        // --如果订单返回到购物车,实际商品是无货,则把库存状态强制设置为无货
                        var skus = outSkus.split(',');
                        for(var i=0,len=skus.length; i<len; i++){
                            if(skus[i] == skuId){
                            	noStock = true;
                                info = '<div class="service-ops-global ftx-01">无货&nbsp;</div>';
                                break;
                            }
                        }

                        // 无货并且失效,且未下架,展示号卡名称,重新添加号码展示部分
                        if (noStock && pncs2 && !unusable) {
                        	var nameDom = linkSkuNode.find(".service-name a");
                        	if (linkSkuNode.attr("linkType") != "3") {
                        		nameDom.html("【号卡】" + linkSkuNode.attr("linkskuname"));
                        		if (!$("#buslinkskupn_" + skuId)) {
                            		var pnDom = '<div class="service-item" id="buslinkskupn_' + linkSkuNode.attr("linkSkuId") + '">' +
    	                                			'<div class="service-name service-name-new" title="' + linkSkuNode.attr("linkskuname") + '">' +
    	                                				'<p style="padding-left: 50px">' + linkSkuNode.attr("pncn") + '</p>' +
    	                                			'</div>' +
                                    			'</div>';
                            		nameDom.after(pnDom);
                            	}
                        	} else {
                        		nameDom.html("【套餐】" + linkSkuNode.attr("linkskuname"));
                        	}
                        }
                        if (noStock && !unusable) {
                        	// 5g号卡失效状态 无货：屏蔽重新选号
                        	linkSkuNode.find(".service-ops-global").remove();
                        	linkSkuNode.find(".service-sum").remove();
                        	linkSkuNode.find(".service-price").remove();
                        	linkSkuNode.append(info);
                        }
                    }
                }
            };
            
            //是否调用库存
            var isCalculateStock = function(id){
            	var calculateStock = $('#product_'+id).attr('calculateStock') || $('#suit_'+id).attr('calculateStock') || $('#vsuit_'+id).attr('calculateStock');
            	//只处理calculateStock为false的情况
            	if(calculateStock == "false"){
            		inStockSku.push(id);
            		return false;
            	}
            	return true;
            }
            // 调用主商品库存状态
            var mainAccSku = '';
            var gifSkuParam = '';
            var skuNum = '';
            var skuNums = ids.split(',');
            for(var i=0,l=skuNums.length; i<l; i++){
            	//不调用库存
            	if(!isCalculateStock(skuNums[i])){
            		continue;
            	}
            	var num = $('#product_'+skuNums[i]).attr('num')||$('#suit_'+skuNums[i]).attr('num')||$('#vsuit_'+skuNums[i]).attr('num');
            	if(num){
            		skuNum += skuNums[i] + ',' + num +';';
            	}
            	//获取附件
            	var giftid = '';
            	var first = true;
            	$('#product_'+skuNums[i]).find('.gift-item').each(function(){
                    if($(this).attr("giftType")=="1"){
                    	if(first){
                    		giftid += $(this).attr("giftid");
                    	}else{
                    		giftid += ',' + $(this).attr("giftid");
                    	}
                    	first = false;
                    	gifSkuParam += $(this).attr("giftid") + ',' + $(this).attr("num") + ';';
                    }
               }) 
               if(giftid != "" && giftid.length > 0){
            	   mainAccSku += skuNums[i] + '-' + giftid + ";";
               }
               
            	if ((i % 50 == 0 && i != 0) || i == (skuNums.length -1)) {
            		if(mainAccSku != "" && mainAccSku.length > 0){
            			mainAccSku = "&mainAccSku=" + mainAccSku;
            		}
            		var storeUrl = me.getStoreUrl(skuNum + gifSkuParam + mainAccSku);
            		skuNum = '';
            		mainAccSku = '';
            		gifSkuParam = '';
                    if (!storeUrl) continue;
                    $.getJSON(storeUrl, updateStockState);
            	}
            }
            // 调用业务绑定商品库存状态
            var blSkuNumStr = '';
            var businessLinkSkuIdsNums = businessLinkSkuIds.split(',');
            for(var i=0,l=businessLinkSkuIdsNums.length; i<l; i++){
            	var num = $('#buslinksku_'+businessLinkSkuIdsNums[i]).attr('num');
            	if(num){
            		blSkuNumStr += businessLinkSkuIdsNums[i] + ',' + num +';';
            	}
            	if ((i % 50 == 0 && i != 0) || i == (businessLinkSkuIdsNums.length -1)) {
            		var storeUrl = me.getStoreUrl(blSkuNumStr);
            		blSkuNumStr = '';
                    if (!storeUrl) continue;
                    $.getJSON(storeUrl, updateLinkServiceSkuStockState);
            	}
            }
        },

        fillLimitInfo: function(ids) {
        	$.ajax({
                url: PurchaseAppConfig.Domain + "/getLimitInfo.action",
                type: "POST",
                dataType: "json",
                data: "skus=" + ids,
                success: function(result) {
                	if (!result.limitResult || result.limitResult == "") {
                		return;
                	}
                	var skuInfos = [];
                	var skuInfo = result.limitResult.split(",");
                	for (var i in skuInfo) {
                		sku = skuInfo[i].split("_");
                		skuInfos[sku[0]] = sku[1];
                	}
                	$(".quantity-txt").each(function() {
                		var ss = $(this).attr("_stock").split("_");
                        var skuId = ss[ss.length - 1];
                        if (skuInfos[skuId] && !$(this).attr("suit")) {
                            var pnode = $(this).parents('.item-item');
                        	// 5g号卡商品 && 失效
                            if (pnode.attr('pncs') == "2" && pnode.attr('pnc') == "true") {
                            	$(this).html('<span class="ftx-01 quantity-tips">' + skuInfos[skuId] +  '且号码已失效' + '</span>');
								var di = $(this).parent().siblings(".p-goods").find(".p-img");
                            	di.find(".p-mask").remove();
                            	di.find(".smart-similar").remove();
                            } else {
                            	$(this).html('<span class="ftx-01 quantity-tips">' + skuInfos[skuId] + '</span>');
                            }
                		}
                	});
                }
        	});
        },
        
        calWeightFreight: function(){
        	var me = this;
			// 是否新人首单
        	var newUser = $("#newUser").val();
        	// 重量
			var notFreshGoodsTotalWeight = 0;
        	var freshGoodsTotalWeight = 0;
            var walmartGoodsTotalWeight = 0;
        	// 商家名称
        	var notFreshVenderName = "";
        	var freshVenderName = "";
        	// 是否只有自营(凑单接口传参)
        	var notFreshOnlyJD = true;
        	var freshOnlyJD = true;
        	// 商品ids(凑单接口传参)
        	var notFreshSkuIds = "";
        	var freshSkuIds = "";
        	
        	// 获取运费参数
        	var freshGoodsInfo = "";
        	var notFreshGoodsInfo = "";
            var walmartGoodsInfo = "";
        	
        	// 是否包含fbp
        	var freshHasFbp = false;
        	var notFreshHasFbp = false;
        	
            var walmartShopFreight = $(".walmart-shop-freight");
            walmartShopFreight.empty();
            if(walmartShopFreight.attr("checkedSkuIds")){
                var walmartWeightSpan = walmartShopFreight.closest(".cart-tbody").find(".weight");
                if (walmartWeightSpan && walmartWeightSpan.length) {
                    walmartWeightSpan.each(function() {
                        if($(this).closest(".item-item").hasClass("item-selected")){
                            walmartGoodsTotalWeight = PurchaseAppConfig.add(walmartGoodsTotalWeight, this.getAttribute("data"), 3);
                            walmartGoodsInfo += this.getAttribute("skuId") + "_" + this.getAttribute("num") + "_" +
                                PurchaseAppConfig.tofix(this.getAttribute("afterPrice")/this.getAttribute("num")) +
                                (this.getAttribute("gift") == 1 ? "_1_" : "_0_") +
                                this.getAttribute("category") + ",";
                        }
                        if (this.getAttribute("gift") == 1) {
                            return;
                        }
                        // 普通赠品
                        var giftNodes = $(this).closest(".item-item").find(".gift-items-new");
                        if (giftNodes.length > 0) {
                            giftNodes.find(".gift-item").each(function () {
                            	if (this.getAttribute("multiGiftShow")) {
                            		return;
                            	}
                                walmartGoodsInfo += this.getAttribute("giftid") + "_" + this.getAttribute("num") + "_0_1_" + this.getAttribute("category") + ",";
                            });
                        }
                        // 礼品购商品
                        var lpNode = $(this).closest(".item-item").find(".giftbox-item");
                        if (lpNode.length > 0 && lpNode.attr("isZy") == 1) {
                            notFreshGoodsInfo += lpNode.attr("lpid") + "_" + lpNode.attr("num") + "_" + lpNode.attr("price") + "_1_" + lpNode.attr("category") + ",";
                        }
                    });
                }
            }
			// 获取并拼接称重运费商品参数（skuId、重量等）
			var freightGoodsInfoHandle = function (self, zyFlag) {
				if ($(self).closest(".item-item").hasClass("item-selected")) {
					if (self.getAttribute("gift") == 1 && self.getAttribute("isZy") != 1 && isZiying) {
						return;
					}
					zyNum++;
					if (self.getAttribute("virNoFreight") == "true") {
						virNoFreightNum++;
					}
					if (self.getAttribute("fresh") == 1) {
						// 生鲜
						// 凑单接口参数、运费接口参数
						if (!zyFlag) {
							freshHasFbp = true;
							if (freshOnlyJD) {
								freshOnlyJD = false;
							}
						}
						freshSkuIds += self.getAttribute("skuId") + ",";
						freshGoodsTotalWeight = PurchaseAppConfig.add(freshGoodsTotalWeight, self.getAttribute("data"), 3);
						freshGoodsInfo += self.getAttribute("skuId") + "_" + self.getAttribute("num") + "_" +
											PurchaseAppConfig.tofix(self.getAttribute("afterPrice")/self.getAttribute("num")) +
											(self.getAttribute("gift") == 1 ? "_1_" : "_0_") +
											self.getAttribute("category") + ",";
					} else {
						// 非生鲜
						if (!zyFlag) {
							notFreshHasFbp = true;
							if (notFreshOnlyJD) {
								notFreshOnlyJD = false;
							}
						}
						notFreshSkuIds += self.getAttribute("skuId") + ",";
						notFreshGoodsTotalWeight = PurchaseAppConfig.add(notFreshGoodsTotalWeight, self.getAttribute("data"), 3);
                        notFreshGoodsInfo += self.getAttribute("skuId") + "_" + self.getAttribute("num") + "_" +
												PurchaseAppConfig.tofix(self.getAttribute("afterPrice")/self.getAttribute("num")) +
												(self.getAttribute("gift") == 1 ? "_1_" : "_0_") +
												self.getAttribute("category") + ",";
					}
					if (self.getAttribute("gift") == 1) {
						return;
					}
					// 普通赠品
					var giftNodes = $(self).closest(".item-item").find(".gift-items-new");
					if (giftNodes.length > 0) {
						giftNodes.find(".gift-item").each(function () {
							if (this.getAttribute("multiGiftShow")) {
                        		return;
                        	}
							if (self.getAttribute("isZy") == 1) {
								if (self.getAttribute("fresh") == 1) {
									freshGoodsInfo += self.getAttribute("giftid") + "_" + self.getAttribute("num") + "_0_1_" + self.getAttribute("category") + ",";
								} else {
									notFreshGoodsInfo += self.getAttribute("giftid") + "_" + self.getAttribute("num") + "_0_1_" + self.getAttribute("category") + ",";
								}
							}
						});
					}
					// 礼品购商品
					var lpNode = $(self).closest(".item-item").find(".giftbox-item");
					if (lpNode.length > 0 && lpNode.attr("isZy") == 1) {
						notFreshGoodsInfo += lpNode.attr("lpid") + "_" + lpNode.attr("num") + "_" + lpNode.attr("price") + "_1_" + lpNode.attr("category") + ",";
					}
				}
			};
			var shop_freights = $(".shop-freight");
			var virNoFreightNum = 0;// 虚拟商品勾选数量
			var zyNum = 0;// 自营商品勾选数量
        	shop_freights.each(function() {
        		var shopFreight = $(this);
        		var isZiying = shopFreight.attr("id").substring(shopFreight.attr("id").indexOf("_") + 1) == PurchaseAppConfig.JD_VENDERID;
				shopFreight.empty();
				if (shopFreight.attr("checkedSkuIds")) {
					var weightSpans = shopFreight.closest(".cart-tbody").find(".weight");
					if (weightSpans.length > 0) {
						weightSpans.each(function () {
							freightGoodsInfoHandle(this, isZiying);
						});
					}
				}
			});
        	if (virNoFreightNum != 0 && zyNum > virNoFreightNum) {
        		shop_freights.each(function(){
            		if ($(this).attr("checkedSkuIds")) {
            			$(this).html("运费以结算时为准");
            		}
            	});
        		return;
        	} else if ((virNoFreightNum != 0 && zyNum == virNoFreightNum)) {// 自营仅勾选虚拟商品、plus或优惠券前置有异常，不计算运费
        		return;
        	}
        	// 获取虚拟店铺及一小时达店铺内的称重商品参数
        	if ($('#fictPopSkuIds').val().length > 0 && (freshGoodsInfo != "" || notFreshGoodsInfo != "")) {
        		var fictPopSkuIds = $('#fictPopSkuIds').val().split(",");
        		for (var ind in fictPopSkuIds) {
        			var weightSpan = $("#weight_" + fictPopSkuIds[ind]);
        			if (weightSpan.length > 0) {
        				var productSpan = $("#product_" + fictPopSkuIds[ind]);
            			var isZiying = productSpan.attr("venderid") == PurchaseAppConfig.JD_VENDERID;
            			freightGoodsInfoHandle(weightSpan[0], isZiying);
        			}
        		}
        	}
        	
        	// 获取运费参数，添加总价和总重量
			freshGoodsInfo = (freshGoodsInfo == "" ? "0" : $("#freshTotalPrice").val()) + "_" + freshGoodsTotalWeight + "," + freshGoodsInfo;
			freshGoodsInfo = freshGoodsInfo.substring(0, freshGoodsInfo.length - 1);
			notFreshGoodsInfo = (notFreshGoodsInfo == "" ? "0" : $("#notFreshTotalPrice").val()) + "_" + notFreshGoodsTotalWeight + "," + notFreshGoodsInfo;
			notFreshGoodsInfo = notFreshGoodsInfo.substring(0, notFreshGoodsInfo.length - 1);
        	walmartGoodsInfo = (walmartGoodsInfo == "" ? "0" : $("#walmartTotalPrice").val()) + "_" + walmartGoodsTotalWeight + "," + walmartGoodsInfo;
            walmartGoodsInfo = walmartGoodsInfo.substring(0, walmartGoodsInfo.length - 1);
        	$.ajax({
                url: PurchaseAppConfig.Domain + "/getZyFreight.action",
                type: "POST",
                dataType: "json",
                data: "t=" + this.t + "&newUser=" + newUser + "&freshGoodsInfo=" + freshGoodsInfo  + "&notFreshGoodsInfo=" + notFreshGoodsInfo + "&walmartGoodsInfo=" + walmartGoodsInfo,
                success: function(result) {
                	if (result.zyFreightConfigs == "" || result.zyFreightResult[0] == "false") {
                		return;
                	}
                	// 运费规则获取
                	var configs = result.zyFreightConfigs.split(",");

                    if ($("#isWmdg").val() != 1) {
                        var walartFreightTotalPrice = PurchaseAppConfig.add(result.zyFreightResult[7], result.zyFreightResult[8]);
                        var walmartshopfreight = $(".walmart-shop-freight");
                        if (walmartshopfreight.attr("checkedSkuIds")) {
                            if (walartFreightTotalPrice == 0) {
                                walmartshopfreight.html('<div class="fw-info-main fw-info-main-fresh"><span class="fw-info-flag"><i class="icon-confirm"></i>已免运费</span></div>');
                            } else {
                                var walmartcontent = '<div class="fw-info-main fw-info-main-fresh">' +
                                                        '<span class="fw-info-flag fw-info-flag-pr0">运费¥' +
                                                            PurchaseAppConfig.tofix(walartFreightTotalPrice, 2) +
                                                        '</span>' +
                                                    '</div>';
                                walmartshopfreight.html(walmartcontent);
                            }
                        }
                    }
                	var Config = function(weight,price){
        				this.weight = weight;
        				this.price = price;
        			}
        			var FreightConfig = function(i){
        				this.configs = new Array();
						var config = configs[i].split("_");
						var weightAndMoney;
						for (var i in config) {
							weightAndMoney = config[i].split("-");
							this.configs.push(new Config(parseInt(weightAndMoney[0]),parseInt(weightAndMoney[1])));
						}
        			}
        			me.notFreshFreightConfig = new FreightConfig(0);
        			me.freshFreightConfig = new FreightConfig(1);
                    // 展示弹窗逻辑
        			me.notFreshFreight = me.getFreightComments(notFreshGoodsTotalWeight, $("#notFreshTotalPrice").val(), notFreshOnlyJD, notFreshSkuIds == "" ? "" : notFreshSkuIds.substring(0, notFreshSkuIds.length-1), me.notFreshFreightConfig);
        			me.freshFreight = me.getFreightComments(freshGoodsTotalWeight, $("#freshTotalPrice").val(), freshOnlyJD, freshSkuIds == "" ? "" : freshSkuIds.substring(0, freshSkuIds.length-1), me.freshFreightConfig);
                	// 解决因10%重量引起的歧义
                	var notFreshTotalPrice = PurchaseAppConfig.add(result.zyFreightResult[1], result.zyFreightResult[2]);
                	var freshTotalPrice = PurchaseAppConfig.add(result.zyFreightResult[4], result.zyFreightResult[5]);
                	if (notFreshTotalPrice == 0 && !me.notFreshFreight.achieve) {
                		me.notFreshFreight.achieve = true;
                		me.notFreshFreight.comments = "已免运费";
                		me.notFreshFreight.diffLevel -= 1;
                		me.notFreshFreight.needPrice = 0;
                		me.notFreshFreight.needWeight = 0;
                	}
                	if (freshTotalPrice == 0 && !me.freshFreight.achieve) {
                		me.freshFreight.achieve = true;
                		me.freshFreight.comments = "已免运费";
                		me.freshFreight.diffLevel -= 1;
                		me.freshFreight.needPrice = 0;
                		me.freshFreight.needWeight = 0;
                	}
        			me.refreshCoudanDialog();
                    if (me.notFreshFreight.have || me.freshFreight.have) {
        	            if (me.notFreshFreight.beyond || me.freshFreight.beyond) {
        	            	shop_freights.each(function(){
        	            		if ($(this).attr("checkedSkuIds")) {
        	            			if (me.notFreshFreight.beyond) {
        	            				$(this).html("超过"+me.notFreshFreightConfig.configs[me.notFreshFreightConfig.configs.length-1].weight+"kg运费以结算页为准");
        	            			} else {
        	            				$(this).html("超过"+me.freshFreightConfig.configs[me.freshFreightConfig.configs.length-1].weight+"kg运费以结算页为准");
        	            			}
        	            		}
        	            	});
        				} else if ((!me.notFreshFreight.have || me.notFreshFreight.achieve) && (!me.freshFreight.have || me.freshFreight.achieve)) {
        					shop_freights.each(function(){
                                    if ($(this).attr("checkedSkuIds")) {
                                        $(this).html('<div class="fw-info-main fw-info-main-fresh"><span class="fw-info-flag"><i class="icon-confirm"></i>已免运费</span></div>');
                                    }
        	            	});
        				} else {
        					var totalPrice = PurchaseAppConfig.tofix(PurchaseAppConfig.add(notFreshTotalPrice, freshTotalPrice));
                        	shop_freights.each(function(){
                                if (!$(this).attr("checkedSkuIds")) {
                                    return;
                                }
            					if (totalPrice == 0) {
            						$(this).html('<div class="fw-info-main fw-info-main-fresh"><span class="fw-info-flag"><i class="icon-confirm"></i>已免运费</span></div>');
            						return;
            					}
            					var freightNeedPrice = me.getNeedPrice(notFreshTotalPrice,freshTotalPrice,me.notFreshFreight.needPrice,me.freshFreight.needPrice);
            					var isZiying = $(this).attr("id").substring($(this).attr("id").indexOf("_") + 1) == PurchaseAppConfig.JD_VENDERID;
                                    var content = 	'<div class="fw-info-main fw-info-main-fresh">' +
                                        '<span class="fw-info-flag"><i class="icon-confirm"></i>' + (isZiying ? '还差<em class="ftx-01">¥' + freightNeedPrice + '</em>免运费' : '本店与京东自营商品共同计算运费') + '</span>' +
                                        '<div class="fw-info-box-new" style="display: none;">' +
            				    						'<div class="fw-info-box-arrow"></div>';
        					    // 非生鲜部分
        					    if (me.notFreshFreight.have) {
    					    	    content += '<h3 class="ml20">非生鲜商品</h3>';
    					    	    if(notFreshTotalPrice == 0){
    					    	    	content += '<p class="cont-tit">运费已免</p><p class="cont-tit">当前重量：'+notFreshGoodsTotalWeight+'kg</p>';
    					    	    }else{
    					    	    	if(result.zyFreightResult[2] > 0){
    					    	    		// var isMYF = result.zyFreightResult[1] == 0;
                                            // <p
											// class="cont-tit">运费小计：¥'+PurchaseAppConfig.tofix(notFreshTotalPrice,
											// 2)+'<em class="ftx-06 ml5">基础运费' + (isMYF ? '已免' :
											// '¥'+PurchaseAppConfig.tofix(result.zyFreightResult[1],2))
											// + '+续重运费
											// ¥'+PurchaseAppConfig.tofix(result.zyFreightResult[2],
											// 2)+'</em></p>
    					    	    		content += '<p class="cont-tit">当前重量：'+notFreshGoodsTotalWeight+'kg<em class="ftx-06 ml5">(超重'+result.zyFreightResult[3]+')</em></p>';
    					    	    	}else{
                                            // <p
											// class="cont-tit">基础运费：¥'+PurchaseAppConfig.tofix(result.zyFreightResult[1],
											// 2)+'</p>
    					    	    		content += '<p class="cont-tit">当前重量：'+notFreshGoodsTotalWeight+'kg</p>';
    					    	    	}
    					    	    }
    					    	    content += '<div class="fw-cont ml20 mt5"><ul>';
        						    for(var i in me.notFreshFreightConfig.configs) {
        						    	if (((parseInt(me.notFreshFreight.diffLevel) + 2) > i && (me.notFreshFreight.diffLevel - 2) < i) || me.notFreshFreight.beyond) {
        						    		content +=	'<li ' + (me.notFreshFreight.diffLevel==i ? 'class="curr"' : '') + '><span>满' + me.notFreshFreightConfig.configs[i].price + '（' + me.notFreshFreightConfig.configs[i].weight + 'kg内）' +
            						                      			(me.notFreshFreight.diffLevel==i ? (me.notFreshFreight.achieve ? '已免运费' : '免运费，还差<em class="ftx-01">¥' + me.notFreshFreight.needPrice + '</em></span>') : '免运费') +
            						                      		'</li>';
        						    	}
        						    }
        						    if (notFreshHasFbp) {
        						    	content += '<li><span class="ftx-03"><i class="fw-tips-icon mr5"></i>'+ (isZiying ? '京东自营和部分店铺': '本店铺与京东自营') + '一起参与非生鲜凑单免运费</span></li>';
        						    }
        						    content += '</ul></div>';
                                    content += '<p class="mb5"><a href="//help.jd.com/user/issue/109-188.html" class="ftx-06 ml20" target="_blank">运费规则&nbsp;&gt;</a></p>';
        					    }
        					    // 生鲜部分
        					    if (me.freshFreight.have) {
        					    	if (me.notFreshFreight.have) {
        					    		content += '<div class="hr"></div>';
        					    	}
        					        content += '<h3 class="ml20">生鲜商品</h3>';
        					        if(freshTotalPrice == 0){
        					        	content += '<p class="cont-tit">运费已免</p><p class="cont-tit">当前重量：'+freshGoodsTotalWeight+'kg</p>';
        					        }else{
        					        	if(result.zyFreightResult[5] > 0){
        					        		// var isMYF = result.zyFreightResult[4] == 0;
                                            // <p
											// class="cont-tit">运费小计：¥'+PurchaseAppConfig.tofix(freshTotalPrice,
											// 2)+'<em class="ftx-06 ml5">基础运费'+(isMYF ? '已免' :
											// '¥'+PurchaseAppConfig.tofix(result.zyFreightResult[4],
											// 2))+'+续重运费
											// ¥'+PurchaseAppConfig.tofix(result.zyFreightResult[5],
											// 2)+'</em></p>
        					        		content += '<p class="cont-tit">当前重量：'+freshGoodsTotalWeight+'kg<em class="ftx-06 ml5">(超重'+result.zyFreightResult[6]+')</em></p>';
        					        	}else{
                                            // <p
											// class="cont-tit">基础运费：¥'+PurchaseAppConfig.tofix(result.zyFreightResult[4],
											// 2)+'</p>
        					        		content += '<p class="cont-tit">当前重量：'+freshGoodsTotalWeight+'kg</p>';
        					        	}
        					        }
        					        content += '<div class="fw-cont ml20 mt5"><ul>';
        					    	for(var i in me.freshFreightConfig.configs) {
        						    	if (((parseInt(me.freshFreight.diffLevel) + 2) > i && (me.freshFreight.diffLevel - 2) < i) || me.freshFreight.beyond) {
        						    		content += 	'<li ' + (me.freshFreight.diffLevel==i ? 'class="curr"' : '') + '><span>满¥' + me.freshFreightConfig.configs[i].price + '（' + me.freshFreightConfig.configs[i].weight + 'kg内）' +
        			                  								(me.freshFreight.diffLevel==i ? (me.freshFreight.achieve ? '已免运费' : '免运费，还差<em class="ftx-01">¥' + me.freshFreight.needPrice + '</em></span>') : '') +
        			                  							'</li>';
        						    	}
        			                }
        					    	if(freshHasFbp){
        					    		content += '<li><span class="ftx-03"><i class="fw-tips-icon mr5"></i>'+  (isZiying ? '京东自营和部分店铺': '本店铺与京东自营') + '一起参与生鲜凑单免运费</span></li>';
        					    	}
        					    	 content += '</ul></div>';
                                     content += '<p class="mb5"><a href="//help.jd.com/user/issue/109-188.html" class="ftx-06 ml20" target="_blank">运费规则&nbsp;&gt;</a></p>';
        					    }
                                    content += '</div></div>';
                                if (((me.notFreshFreight.have && !me.notFreshFreight.achieve) || (me.freshFreight.have && !me.freshFreight.achieve))
                                		&& !me.freightCouDowngrade() && me.t != me.myfridge) {
                                	content += '<a class="ftx-07 J_order_combined" clstag="pageclick|keycount|cart_201610202|2" href="#none">去凑单 ></a>';
                                }
        						var uplusState = $(this).attr("uplusState");
        						if (uplusState == "1") {
        							if (!me.plusProbationDowngrade()) {
        								content += '<a href="//plus.jd.com/index" target="_blank" class="ftx-07 ml5" clstag="pageclick|keycount|201601152|26">试用PLUS立得1张运费券 &gt;</a>';
        							}
        						} else if (uplusState == "2" || uplusState == "3" || uplusState == "4") {
        							content += '<a href="//plus.jd.com/order/page" target="_blank" class="ftx-07 ml5" clstag="pageclick|keycount|201601152|27">开通PLUS每月领5张运费券 &gt;</a>';
        						}
        						$(this).html(content);
            				});
        				}
                    }
                }
          	});
        },

        getNeedPrice:function(notFreshTotalPrice, freshTotalPrice,notFreshFreightNeedPrice,freshFreightNeedPrice){
        	var needPrice = '';
        	if(notFreshTotalPrice == 0 && freshTotalPrice > 0){
        		needPrice = freshFreightNeedPrice;
        	}else if(notFreshTotalPrice >0 && freshTotalPrice == 0){
        		needPrice = notFreshFreightNeedPrice;
        	}else if(notFreshTotalPrice >0 && freshTotalPrice > 0){
        		needPrice = notFreshFreightNeedPrice;
        	}
        	return needPrice;
        },
        
		getFreightComments: function (weight, price, isOnlyJD, skuIds, freightConfig){
			var freightResult = new function(){
				this.totalWeight = 0;
				this.needWeight = 0;
				this.totalPrice = 0;
				this.needPrice = 0;
				this.diffLevel = -1;
				this.achieve = false;
				this.beyond = false;
				this.isOnlyJD = false;
				this.comments = "";
				this.have = false;
				this.skuIds = "";
			}();
			if (price == 0) {// 最低规则
				return freightResult;
			}
			freightResult.have = true;
			freightResult.totalWeight = weight;
			freightResult.totalPrice = price;
			freightResult.isOnlyJD = isOnlyJD;
			freightResult.skuIds = skuIds;
			if (weight > freightConfig.configs[freightConfig.configs.length-1].weight) {// 超重
				freightResult.beyond = true;
				freightResult.diffLevel = freightConfig.configs.length;
				freightResult.comments = "超过" + freightConfig.configs[freightConfig.configs.length-1].weight + "kg运费以结算页为准";
			} else {
				var handleResult = function(price, w, p) {
					if (price >= p) {
						freightResult.achieve = true;
						freightResult.comments = "已免运费";
					} else {
						freightResult.needPrice = PurchaseAppConfig.tofix(PurchaseAppConfig.sub(p, price));
						freightResult.comments = "满￥" + p + "免运费(" + w + "kg内)";
					}
				};
				for (var i in freightConfig.configs) {
					var config = freightConfig.configs[i];
					if (weight <= config.weight) {
						freightResult.diffLevel = i;
						freightResult.needWeight = PurchaseAppConfig.sub(config.weight, weight, 3);
						handleResult(price, config.weight, config.price);
						break;
					}
				}
			}
			return freightResult;
		},

        // 礼品购
        loadIconsFromExt: function (result){
            $('.giftbox-item').hover(function () {
                $('.giftbox-ops a', this).removeClass('hide');
            }, function () {
                $('.giftbox-ops a', this).addClass('hide');
            });
        },
        
        // 滞留商品营销信息
        loadProductUnmarket: function () {
            if(this.unmarketDowngrade()){
                return;
            }
            var paramArr = [];
            $(".cart-warp .unmarket-items").each(function(i, o){
                paramArr.push($(o).attr("data"));
            });
            if(paramArr.length>0) {
                var randerUnmarket = function(result) {
                    if(result && result.data && result.data.length>0) {
                        for(var i=0;i<result.data.length;i++) {
                            try{
                                var to = result.data[i];
                                if(to.data.length>0) { 
                                    var tempHtml = [];
                                    tempHtml.push('');
                                    tempHtml.push('<div class="unmarket-item">');
                                    tempHtml.push('    <i class="unmarket-icon mr5"></i>');
                                    tempHtml.push('    <div class="unmarket-info fl mr10">');
                                    if(to.data[0].type==2) {
                                        tempHtml.push('        <a title="' + to.data[0].wname + '" target="_blank" clstag="pageclick|keycount|cart_201608302|1" href="' + to.data[0].url + '">');
                                        tempHtml.push('            ' + to.data[0].wname + '');
                                        tempHtml.push('        </a>');
                                    } else {
                                        var toname = to.data[0].extLabel?to.data[0].extLabel[0] : '';
                                        tempHtml.push('        <a title="“' + toname + '”提到该商品" target="_blank" clstag="pageclick|keycount|cart_201608302|1" href="' + to.data[0].url + '">');
                                        tempHtml.push('            “' + toname + '”提到该商品');
                                        tempHtml.push('        </a>');
                                    }
                                    tempHtml.push('    </div>');
                                    if(to.data.length>1) {
                                        tempHtml.push('    <a class="unmarket-more hide" clstag="pageclick|keycount|cart_201608302|2" href="#none">更多</a>');
                                        tempHtml.push('    <div class="unmarket-more-dialog hide">');
                                        tempHtml.push('        <h3>商品动态：</h3><i class="unmarket-more-dialog-arrow"></i>');
                                        tempHtml.push('        <ul class="unmarket-more-items">');
                                        for (var j=1;j<to.data.length;j++) {
                                            var cto = to.data[j];
                                            tempHtml.push('            <li class="unmarket-more-item">');
                                            tempHtml.push('                <a class="unmarket-item-img fl" target="_blank" clstag="pageclick|keycount|cart_201608302|3" href="'+cto.url+'">');
                                            tempHtml.push('                    <img width="106" height="48" alt="" src="' + cto.imageurl + '">');
                                            tempHtml.push('                </a>');
                                            if(cto.type==2) {
                                                tempHtml.push('                <a class="unmarket-item-info ml10 fl" target="_blank" clstag="pageclick|keycount|cart_201608302|3" href="'+cto.url+'" title="' + cto.wname + '">' + (cto.wname.length>30 ? cto.wname.substring(0,30) +'...' : cto.wname) + '</a>');
                                            } else {
                                                var ctoname = cto.extLabel? cto.extLabel[0] : '';
                                                tempHtml.push('                <a class="unmarket-item-info ml10 fl" target="_blank" clstag="pageclick|keycount|cart_201608302|3" href="'+cto.url+'" title="" title="' + ctoname + '">' + (ctoname.length>30 ? ctoname.substring(0, 30) +"..." : ctoname) + '</a>');
                                            }
                                            tempHtml.push('            </li>');
                                        }
                                        tempHtml.push('        </ul>');
                                        tempHtml.push('    </div>');
                                    }
                                    tempHtml.push('</div>');
                                    $("[_unmarket=unmarket_" + to.key + ']').html(tempHtml.join(''));
                                    $('.unmarket-item').hover(function () {
                                        var uo = $(this).find('.unmarket-more');
                                        if(uo.length>0) {
                                            uo.removeClass('hide');
                                        }
                                    }, function () {
                                        var uo = $(this).find('.unmarket-more');
                                        if(uo.length>0) {
                                            uo.addClass('hide');
                                        }
                                    });
                                }
                            }catch(e){}
                        }
                    }
                };
                var requestGetCleverInfo = function(dataArr) {
                    jQuery.ajax({
                        type  : "POST",
                        dataType : "json",
                        url   : '//clever.jd.com/rule/getCleverInfo.action?callback=?',
                        data  : {source : 2, ext :dataArr.join('|')},
                        success : function(result) {
                            randerUnmarket(result);
                        },
                        error:function(XMLHttpResponse){
                        }
                    });
                };
                if (paramArr.length<=70) {
                    requestGetCleverInfo(paramArr);
                } else {
                    requestGetCleverInfo(paramArr.slice(0, 70));
                    requestGetCleverInfo(paramArr.slice(70, paramArr.length));
                }
            }
        },

        // 山姆换区弹层
        showSamDlg: function(showSam, result){
        	try{
        		if (!showSam) {
        			return;
        		}
        		var replacedSkus = result.replacedSkus;
				if (replacedSkus) {
					var count = 0;
					var html = 
						'<div class="psam-thickbox">'+
							'<div class="tip-box icon-box-new">'+
								'<span class="warn-icon m-icon"></span>'+
								'<div class="item-fore">'+
									'<h3>由于地址切换，以下商品价格和库存</h3>'+
									'<h3>可能会发生变化</h3>'+
								'</div>'+
							'</div>'+
							'<div class="goods-items">';
					while (count < replacedSkus.length) {
						var sku = replacedSkus[count++];
						html +=
								'<div class="goods-item">'+
									'<div class="goods-msg">'+
										'<div class="p-img">'+
											'<a href="#none"><img width="50" height="50" src="//img13.360buyimg.com/n1/s50x50_'+sku.imgUrl+'" /></a>'+
										'</div>'+
										'<div class="goods-msg-gel">'+
											'<div class="p-name">'+
												'<a href="#none" title="'+sku.name+'">'+sku.name+'</a>'+
											'</div>'+
										'</div>'+
										'<div class="clr"></div>'+
									'</div>'+
									'<div class="clr"></div>'+
								'</div>';
					}
					html += 
							'</div>'+
							'<div class="op-btns ac">'+
								'<a href="#none" class="btn-1 replaceItems">知道了</a>'+
							'</div>'+
						'</div>';
					$('body').dialog({
		                title: '提示',
		                width: 420,
		                height : count > 1 ? 260 : 200,
		                type: 'html',
		                source: html
		            });
				}
        	}catch(e){}
        },

        // 延保和京东家服务
        initYanBao: function(){
            $('.service-item').hover(function () {
                $(this).children('.service-ops').show();
            }, function () {
                $(this).children('.service-ops').hide();
            });
            var ids = $("#ids").val();
            var len = $("#cart-list input[type=checkbox]:checked").length;
            if(!ids && !len){
                return;
            }

            var me = this;
            // 延保信息的对象
            me.ybobjs = {};
            me.jdhsobjs = {};
            jQuery.ajax({
                type : "POST",
                dataType : "json",
                url : this.iurl + "/queryProductService.action?random=" + Math.random() + "&t="+this.t,
                data : null,
                success : function(result) {
                    var ybinfos = result.productYbInfos;
                    var jshsinfos = result.jdHomeServiceResult;
					// if( (!ybinfos || !ybinfos.length) && (!jshsinfos || !jshsinfos.length)){
					// return;
					// }
	                if(ybinfos){
                    	// 找到支持延保的节点
                    	for(var i=0,len = ybinfos.length; i<len; i++){
                    		var ybinfo = ybinfos[i];
                    		
                    		// 支持延保的节点，并加入延保信息的位置，加入
                    		var node = null;
                    		var suitId = ybinfo.suitId;
                    		var wid = ybinfo.wid;
                    		
                    		if(ybinfo.suitId){
                    			node = $('#product_promo_' + suitId + ' [_yanbao=yanbao_' + wid + '_' + suitId + ']');
                    		} else{
                    			node = $('#product_' + wid + ' [_yanbao=yanbao_' + wid + '_' + suitId + ']');
                    		}
                    		
                    		if(node){
                    			node.show();
                    			if (me.isOverseasLoc()) {
                    				node.addClass("service-n");
                    				node.html('<i class="jd-service-n-icon"></i><a data-tips="选服务" class="ftx-03" href="#none">选服务</a>');
                    				var otips = node.next(".promise[overseasLoc]");
                    				if (otips.length == 0) {
                    					node.after('<span class="promise" overseasLoc="1"><i class="global-tips-icon" data-tips="海外地区暂不支持选包装、选服务"></i></span>');
                    				}
                    			} else {
                    				node.html('<i class="jd-service-icon"></i><a data-tips="选服务" class="ftx-03 jd-service" href="#none">选服务</a>');
                    			}
                    		}
                    		// 将延保信息存储在一个对象里。
                    		me.ybobjs[wid + '_' + suitId] = {};
                    		me.ybobjs[wid + '_' + suitId].data = ybinfo;
                    	}
                    }
                    if(jshsinfos && jshsinfos.serviceVOs){
                    	var jdhinfo = jshsinfos.serviceVOs;
                    	// 支持服务的节点，并加入服务信息的位置，加入
                    	for(var i=0,len = jdhinfo.length; i<len; i++){
                    		var jshsinfo = jdhinfo[i];
                    		var jdHomeServiceGroups = jshsinfo.jdHomeServiceGroups;
                    		var jsnode = null;
                    		var skuId = jshsinfo.skuId==null?"":jshsinfo.skuId;
                    		var vskuId = jshsinfo.vskuId==null?"":jshsinfo.vskuId;
                    		var suitPromoId = jshsinfo.suitPromoId==null?"":jshsinfo.suitPromoId;
                    		if(vskuId){
                    			jsnode = $('span[_service=service_'+skuId+'_'+vskuId+']');
                    		} else if(suitPromoId){
                    			jsnode = $('#product_promo_' + suitPromoId + ' [_service=service_' + skuId + '_' + vskuId + ']');
                    		}else{
                    			jsnode = $('span[_service=service_'+skuId+'_'+vskuId+'][isproduct=1]');
                    		}
                    		if(jsnode && jdHomeServiceGroups && jdHomeServiceGroups.length != 0){
                    			jsnode.show();
                    			if (me.isOverseasLoc()) {
                    				if(!jsnode.hasClass('service-n')){
                    					jsnode.addClass("service-n");
                    					jsnode.html('<i class="jd-service-n-icon"></i><a data-tips="选服务" class="ftx-03" href="#none">选服务</a>');
                    					var otips = jsnode.next(".promise[overseasLoc]");
                    					if (otips.length == 0) {
                    						jsnode.after('<span class="promise" overseasLoc="1"><i class="global-tips-icon" data-tips="海外地区暂不支持选包装、选服务"></i></span>');
                    					}
                    				}
                    			} else {
                    				var services = jsnode.find('.jd-service-icon');
                    				if(services.length == 0){
                    					jsnode.html('<i class="jd-service-icon"></i><a data-tips="选服务" class="ftx-03 jd-service" href="#none">选服务</a>');
                    				}
                    			}
                    		}
                    		// 将延保信息存储在一个对象里。
                    		me.jdhsobjs[skuId + '_' + vskuId + "_" + suitPromoId] = {};
                    		me.jdhsobjs[skuId + '_' + vskuId + "_" + suitPromoId].data = jshsinfo;
                    	}
                    }
                    // 已选服务中无效
                    if(jshsinfos && jshsinfos.invalidServicesList && !me.isOverseasLoc()){
                    	var invalidServicesList = jshsinfos.invalidServicesList;
                    	for(var j=0,listlen=invalidServicesList.length;j<listlen;j++){
                			var jhsnode = $('a[jhsid='+invalidServicesList[j]+']').closest('.service-item');
                			jhsnode.find('div:gt(0):lt(2)').remove();
                			jhsnode.find('div:eq(0)').removeClass('service-name-new').addClass('service-name-global').attr('data-tips','该地区暂不支持').attr('title','').after('<div class="service-remark mr10"><span class="ftx-03">该地区暂不支持</span></div>');
                			jhsnode.find('div:eq(2)').removeClass('service-ops').addClass('service-ops-global').css('display','block');
            			}
            		}
                    // 找到支持服务的节点
                    me.overseasLocTips();
                },
                error:function(XMLHttpResponse){}
            });
        },
        
        initCartSmart: function() {
    		if($('#isCssdg').val() != 0 && $('#isCsudg').val() != 0) {
				return;
			}
    		var me = this;
    		jQuery.ajax({
                url: "//rsc.jd.com/rsc/showrs",
                dataType: 'jsonp',
                success: function (result) {
                    // 请求是否成功
                    if(result.errorId == 0){
                    	me.bindCartSmartEvent();
                    	me.loadCartSmartUnsale();
                    }
                }
            })
        },
     
        loadCartSmartUnsale: function() {
        	var me = this;
        	if($('#isCsudg').val() == 0 && $('#cart-smart').length > 0) {
    			$('#cart-smart').empty();
	        	require.async('user/cart/js/cart-smart-unsale', function(carSmartUnsale){
	        	    try{
	                    carSmartUnsale(function(){
	                    	if($('#isRgdg').val() == 0){
	                    		me.smartTipShow=true;
	                    		me.cartSmartFloatTips();
	                    	}
	                    });
	                } catch(e){}
	            });
        	}
        },
        
        bindCartSmartEvent: function() {
    		var me = this;
        	if($('#isCssdg').val() == 0 && !me.unfindStockState) {
    	    	$(".cart-warp").delegate(".item-item:not(.item-invalid)", "mouseenter", function() {
    	        	var o = $(this).find(".p-img > a");
    	        	var pnCard =  o.attr("pnc");
    	        	if (pnCard == "true") {
    	        		return;
    	        	} 
    	        	var skuId = o.attr("good-similar");
    	        	if (skuId && skuId != "" && !o.next().hasClass('p-mask')) { // 避免重复添加无货标识
    	        		if ($(this).find(".cart-similar").size()) {
        	        		$(this).find(".p-img > a").after('<b class="p-mask"></b><span class="smart-similar" clstag="pageclick|keycount|cart_201610202|67">找相似<b></b></span>');
    	        		} else {
    	        			$(this).find(".p-img > a").after('<b class="p-mask"></b><span class="smart-similar" clstag="pageclick|keycount|cart_201610202|67">找相似<b></b></span><div class="cart-similar" name="cs_'+skuId+'"><div class="cs-tit">找相似<b></b></div><div class="cs-cont"><div class="cs-empty"></div></div></div>');
    	        		}
    	        	}
    	    	});
    	    	
    	    	$(".cart-warp").delegate(".item-item:not(.item-invalid)", "mouseleave", function() {
    	        	if ($(this).find(".p-img > a").attr("pnc") == "true") {
    	        		return;
    	        	} 
    	    		if ($(this).find(".p-mask").siblings(".smart-similar").length > 0) {
    	    			$(this).find(".p-mask,.smart-similar").remove();
    	    		}
    	    	});
    	    	
    	    	$('.cart-warp').delegate('.smart-similar', 'click', function(e){
    	            var _me = this;
    	            me.clearDialog();
    	            if ($(this).attr("pnc") == "true") {
    	        		return;
    	        	}
    	            $(this).siblings('.cart-similar').slideDown();
    	            var csId = $(this).closest('.p-img').find('.cart-similar').attr('name');
    	            require.async('user/cart/js/cart-smart-similar', function(carSmartSimilar){
    	                try{
    	                	carSmartSimilar((csId.split("_"))[1], _me, function(r){});
    	                } catch(err){}
    	            });
    	            if(me.isLowIE()){
    	                $(this).closest('.item-item').parent().css('z-index', 2);
    	                $(this).closest('.item-item').css('z-index', 20);
    	                $('input[name="checkShop"]').parent().css('z-index', -1);
    	                $(this).closest('.item-list').prev().children('.cart-checkbox').css('z-index', 'auto');
    	            }
    	        });
        	}
        	if ($('#isCsudg').val() == 0) {
        		// 绑定购物车帮你选加车按钮
                $('body').delegate('#cart-smart a.btn-append', 'click', function(){
                    var $el = $(this);
                    cartObj.jGate($el.attr('_pid'), 1, 1, 0, 0, function(){
                        $el.closest(".mt5").after('<div class="addsucc-tips"><i></i><span>成功加入购物车</span></div>');
                        setTimeout(function(){
                            $('#cart-smart .addsucc-tips').remove();
                        }, 500);
                    });
                });
        	}
        },
        
        unbindSmartCartEvent:function(cssdg) {
        	// 有货找相似降级
        	if (cssdg != 0) {
        		$(".cart-warp").undelegate(".item-item:not(.item-invalid)","mouseenter");
        		$(".cart-warp").undelegate(".item-item:not(.item-invalid)","mouseleave");
        	}
        	$('#isCssdg').val(cssdg);
        },
        
        // 初始化无货找相似
        initNoSockSimilar: function(){
            var me = this;
            $('.cart-warp').delegate('.J_nogood_similar', 'click', function(e){
                var _me = this;
                me.clearDialog();
                $(this).siblings('.cart-similar').slideDown();
                var csId = $(this).next('.cart-similar').attr('name');
                require.async('user/cart/js/cart-similar', function(carSimilar){
                    try{
                        carSimilar((csId.split("_"))[1], _me);
                    } catch(err){}
                });
                if(me.isLowIE()){
                    $(this).closest('.item-item').parent().css('z-index', 2);
                    $(this).closest('.item-item').css('z-index', 20);
                    $('input[name="checkShop"]').parent().css('z-index', -1);
                    $(this).closest('.item-list').prev().children('.cart-checkbox').css('z-index', 'auto');
                }
            });
        },
        
        // 智慧参谋新手引导
        cartSmartFloatTips:function(){
            var me = this;
            if(me.smartTipShow && !me.opPromoShow && $("#cart-smart").html()!=""){
            	me.smartTipShow = false;
            	// 写入浮层
            	$('#cart-floatbar').prepend('<div class="smart-guide-bottom"><div class="ac"><span><a href="#cart-smart">点击这里查看 " 购物车帮你选 "<i class="arr"></i></a></span></div></div>');
                var goalTop = $('#cart-floatbar').offset().top;
                var baseH = $(window).height();
                var scrollH = $(document).scrollTop();
                // 初始化显示
                if(baseH + scrollH < goalTop) {
                  if(me.isLowIE()){
                    $('.smart-guide-bottom').addClass('fixed-bottom').css({bottom: '50px','background': 'none','box-shadow': 'none'});
                  } else {
                    $('.smart-guide-bottom').addClass('fixed-bottom').css({bottom: '50px','background-color': 'inherit','box-shadow': 'none'});
                  }
                }
                $(window).scroll(function() {
                	if($('.smart-guide-bottom').length < 1){
                		return ;
                	}
                    if(baseH + $(document).scrollTop() < goalTop) {
                      if(me.isLowIE()){
                        $('.smart-guide-bottom').addClass('fixed-bottom').css({bottom: '50px','background': 'none','box-shadow': 'none'});
                      } else {
                        $('.smart-guide-bottom').addClass('fixed-bottom').css({bottom: '50px','background-color': 'inherit','box-shadow': 'none'});
                      }
                    } else {
                        $('.smart-guide-bottom').removeClass('fixed-bottom');
                    }
                });
                setTimeout(function(){$('.smart-guide-bottom').remove();},5000);
            }
        },

        // 切换到医药城购物车鼠标移动事件
		initChangeBookMark: function(){
            $('.cart-filter-bar').switchable({
                navItem:'switch-cart-item',
                navSelectedClass:'curr',
                mainClass:'tab-con',
                event:'mouseover',
                callback:function(c,d,e){
                    var a = $(this.el);
                    var b=$(this.nav[c]).position().left;
                    var w=$(this.nav[c]).width();
                    a.find(".floater").width(w).animate({left: b},500);
                }
            });
        },        

        // 隐藏页面所有找相似窗口
        hideAllStockSimilar: function(){
            var me = this;
            $('.cart-similar').each(function(){
                $(this).slideUp(200);
                if(me.isLowIE()){
                    $(this).closest('.item-item').parent().css('z-index', 'auto');
                    $(this).closest('.item-item').css('z-index', 'auto');
                }
            });
        },

        // 移除下柜商品弹出浮层窗口
        removeNosellSkuDlg : function(el, batch){
            var html;
            if (batch) {
                if(!$(".noselling").length){
                   this.showAlertDlg('没有下柜商品！');
                   return;
                }
	            html = '<div class="tip-box icon-box">'
                     + '<span class="warn-icon m-icon"></span>'
                     + '<div class="item-fore">'
                     + '<h3 class="ftx-04">清除所有下柜商品</h3><div class="ftx-03">清除后下柜商品将不在购物车中显示。</div>'
                     + '</div>'
                     + '<div class="op-btns ac">'
                     + '<a href="#none" class="btn-1 re-select-nosell">确定</a>'
                     + '<a href="#none" class="btn-9 ml10 re-cancel-nosell">取消</a>'
                     + '</div>'
                     + '</div>';
            } else {
                html = '<div class="tip-box icon-box">'
                     + '<span class="warn-icon m-icon"></span>'
                     + '<div class="item-fore">'
                     + '<h3 class="ftx-04">删除商品？</h3><div class="ftx-03">删除后此商品将不在购物车中显示。</div>'
                     + '</div>'
                     + '<div class="op-btns ac">'
                     + '<a href="#none" class="btn-1 select-nosell-remove" selectstate="' + (el.attr("selectstate") || '')
                     + '" data-show="" data-bind="' + (el.attr("id") || '')
                     + '" data-name="' + (el.attr("data-name") || '')
                     + '" data-more="' + (el.attr("data-more") || '')
                     + '" >确定</a><a class="btn-9 ml10 cancel-nosell-remove" href="#none">取消</a>'
                     + '</div>'
                     + '</div>';
            }
            $('body').dialog({
                title: batch ? '清除下柜商品' : '删除',
                width: 400,
                height: 100,
                type: 'html',
                source: html
            });
        },
        
        //清除单个下柜商品
        removeUnusableSku : function(el, callback) {
            var skuid = el.attr('data-bind');
            var params = "&pid=" + skuid
                        + "&ptype=1"
                        + "&t=" + this.t;
            var selectstate = el.attr('selectstate');
            var productDom = $("#product_" + skuid);
            if(productDom) {
            	var handtailor = productDom.attr("handtailor");
            	params += "&skuUuid=" + productDom.attr("skuuuid")
            	+ ((handtailor == "true") ? "&useUuid=true" : "")
            }
            if(this.checkSku(skuid)){
                actionUrl = this.iurl + "/removeSkuFromCart.action?rd=" + Math.random()+"&fresh=1";
                if(2 == selectstate){
                    actionUrl += "&selectState_=2";
                }
                this.updateCartInfo(actionUrl, params, "删除下架商品失败", callback);
            } else{
                this.showAlertDlg('对不起，您删除的商品不存在！');
            }
        },
        
        removeNosellProduct : function(el, callback) {
            var curid = el.attr('data-bind');
            var ss = curid.split("_");
            var venderid = ss[1];
            var id = ss[2];
            var type = ss[3];
            var targetId = 0;
            var packId = 0;
            if(ss.length==5 || ss.length==6){
                targetId = ss[4];
                if(ss.length==6){
                    packId = ss[5];
                }
            }
            var params = "venderId=" + venderid + "&pid=" + id
                        + "&ptype=" + type
                        + "&packId=" + packId
                        + "&targetId=" + targetId
                        + "&t=" + this.t;
            var giftSkuIdMap = {};giftSkuIdMap[id]=true;
            this.removeGiftCartBox(id, giftSkuIdMap);
            this.removeSku(params, id, callback, el.attr("selectstate"));
        },

        removeSkuDlg: function(el){
        	/*
			 * 我的关注是否降级。这块儿的处理逻辑是，通过js去获取推荐栏的[我的关注]标签。 如果该标签存在，则说明[我的关注没有降级]，删除商品的弹出信息正常显示；
			 * 如果该标签不存在，则去掉这里弹出层的关注等字样和按钮 BY chenlian
			 */
            // 1. 单个、数量变为0；2. 删除套装的子商品；（非虚拟组套能删）3.批量选中删除
            var useFavorite = true;
            if (el.attr("id")) {
                var ss = el.attr("id").split("_");
                if (ss.length>3 && (ss[3] == SkuItemType.Packs || ss[3] == SkuItemType.PacksOfManFanPacks || ss[3] == SkuItemType.PacksOfManZengPacks)) {
                    useFavorite = false;
                }
            }
            var msg = (useFavorite && !this.favoriteDowngrade()) ? '您可以选择移到关注，或删除商品。' : '';
            if(!el.hasClass("remove-batch") && el.attr("selectstate") == "1"){
                msg += '操作后，其他商品不享受套装优惠。';
            }
            var bhtml = el.hasClass('remove-batch') ? 'data-batch="true"' : '';
            if(bhtml){
                // 判断是否勾选商品
                if(!$(".item-selected").length){
                    this.showAlertDlg('请至少选中一件商品！');
                    return;
                }
            }
            if(bhtml.length==0 && el.attr("ob")=="true"){
	            var html = '<div class="tip-box icon-box">'
                + '<span class="warn-icon m-icon"></span>'
                + '<div class="item-fore">'
                + '<h3 class="ftx-04">将商品删除会同时取消常买设施，继续？</h3>'
                + '</div>'
                + '<div class="op-btns ac">'
                + '<a href="#none" class="btn-9 select-remove" selectstate="' + (el.attr("selectstate") || '')
                + '" data-show="" data-bind="' + (el.attr("id") || '')
                + '" data-name="' + (el.attr("data-name") || '')
                + '" data-more="' + (el.attr("data-more") || '')
                + '" ' + bhtml + '>删除</a>'
                + '<a href="#none" class="btn-9 ml10 cancel-follow">暂不删除</a>'
                + '</div>'
                + '</div>';
            }else{
	            // 注释同841行
	            var str_select_follow = (useFavorite && !this.favoriteDowngrade()) ? '<a href="#none" class="btn-1 ml10 re-select-follow" selectstate="' + (el.attr("selectstate") || '') + '" data-bind="' + (el.attr("id") || '') + '" ' + bhtml + ' clstag="clickcart|keycount|xincart|cart_sku_del_gz">移到我的关注</a>' : '';  
	            var html = '<div class="tip-box icon-box">'
                + '<span class="warn-icon m-icon"></span>'
                + '<div class="item-fore">'
                + '<h3 class="ftx-04">删除商品？</h3><div class="ftx-03">' + msg + '</div>'
                + '</div>'
                + '<div class="op-btns ac">'
                + '<a href="#none" class="btn-9 select-remove" selectstate="' + (el.attr("selectstate") || '')
                + '" data-show="" data-bind="' + (el.attr("id") || '')
                + '" data-name="' + (el.attr("data-name") || '')
                + '" data-more="' + (el.attr("data-more") || '')
                + '" ' + bhtml + '>删除</a>'
                + str_select_follow
                + '</div>'
                + '</div>';
            }
            $('body').dialog({
                title: '删除',
                width: 400,
                height: 100,
                type: 'html',
                source: html
            });
        },

        // 删除商品
        remove: function(el, bbatch){
            // 批量删除
            if(bbatch){
                this.removeBatch();
            } else{
                this.removeProduct(el);
            }
        },

        removeBatch: function(){
            var me = this;
            var html = '',removeIds=[];

            var selected = $(".item-selected");
            if(selected && selected.length){// 如果有选中商品
                $('#cart-list .item-selected').each(function(){
                    var removeitem = $('.cart-remove', $(this));
                    if(removeitem.length){
                        var curid = removeitem.attr('id');
                        var type = curid.split("_")[3];
                        // 单品，满返套装中的单品，满赠套装中的单品：删除商品后可以重新购买
                        if(type == SkuItemType.Sku || type == SkuItemType.SkuOfManFanPacks || type == SkuItemType.SkuOfManZengPacks){
                            var id = curid.split("_")[2];
                            removeIds.push(id);
                            var name = removeitem.attr("data-name");
                            var ss = removeitem.attr("data-more").split("_");
                            var price = ss[1];
                            var num = ss[2];

                            html += me.rebuyHtml(id, name, price, num, curid);
                        }
                    }
                });
                this.removeGiftCartBox(removeIds.join(','), this.getGiftServiceIdsMap());
                this.updateCartInfo(this.iurl + '/batchRemoveSkusFromCart.action',
                    null,
                    '批量删除商品失败',
                    function(){
                        if(html){
                            $(".cart-removed").append(html);
                            $(".cart-removed").show();
                        }
                    }
                );
            }else{
                this.showAlertDlg('请至少选中一件商品！');
            }
        },

        removeProduct: function(el){
            var curid = el.attr('data-bind');
            var ss = curid.split("_");
            var venderid = ss[1];
            var id = ss[2];
            var type = ss[3];
            var targetId = 0;
            var packId = 0;
            if(ss.length==5 || ss.length==6){
                targetId = ss[4];
                if(ss.length==6){
                    packId = ss[5];
                }
            }
            var me = this;
            var params = "venderId=" + venderid + "&pid=" + id
                        + "&ptype=" + type
                        + "&packId=" + packId
                        + "&targetId=" + targetId
                        + "&t=" + me.t;
            // 单品，满返套装中的单品，满赠套装中的单品：删除商品后可以重新购买
            if(type == SkuItemType.Sku || type == SkuItemType.SkuOfManFanPacks || type == SkuItemType.SkuOfManZengPacks){
            	// 有重复的先删掉
                $("#removedShow-"+id).remove();
                var name = el.attr("data-name");
                ss = el.attr("data-more").split("_");

                var price = ss[1];
                var num = ss[2];
                var html = this.rebuyHtml(id, name, price, num, curid);
                this.removeGiftCartBox(id, this.getGiftServiceIdsMap());
                this.removeSku(params, id, function(){
                    if(html){
                        $(".cart-removed").append(html);
                        $(".cart-removed").show();
                    }
                });
            } else{
                this.removeSku(params, id, null, el.attr("selectstate"));
            }
        },
        
        removeProduct: function(el){
            var curid = el.attr('data-bind');
            var ss = curid.split("_");
            var venderid = ss[1];
            var id = ss[2];
            var type = ss[3];
            var targetId = 0;
            var packId = 0;
            if(ss.length==5 || ss.length==6){
                targetId = ss[4];
                if(ss.length==6){
                    packId = ss[5];
                }
            }
            var me = this;
            var params = "venderId=" + venderid + "&pid=" + id
                        + "&ptype=" + type
                        + "&packId=" + packId
                        + "&targetId=" + targetId
                        + "&t=" + me.t;
            // 单品，满返套装中的单品，满赠套装中的单品：删除商品后可以重新购买
            if(type == SkuItemType.Sku || type == SkuItemType.SkuOfManFanPacks || type == SkuItemType.SkuOfManZengPacks){
            	// 有重复的先删掉
                $("#removedShow-"+id).remove();
                var name = el.attr("data-name");
                ss = el.attr("data-more").split("_");

                var price = ss[1];
                var num = ss[2];
                var html = this.rebuyHtml(id, name, price, num, curid);
                this.removeGiftCartBox(id, this.getGiftServiceIdsMap());
                this.removeSku(params, id, function(){
                    if(html){
                        $(".cart-removed").append(html);
                        $(".cart-removed").show();
                    }
                });
            } else{
                this.removeSku(params, id, null, el.attr("selectstate"));
            }
        },

        rebuyHtml: function(id, name, price, num, curid){
        	// 是否需要显示我的关注，逻辑同 841 行
            var str_select_follow = !this.favoriteDowngrade() ? '<a class="cart-follow" href="javascript:void(0);" clstag="clickcart|keycount|xincart|SaveFavorite" id="' + curid + '" data-more="bremoved">移到我的关注</a>' : '';
            return '<div class="r-item" id="removedShow-' + id + '">'
                    + '<div class="r-name"><a href="//item.jd.com/' + id + '.html">'+ name +'</a></div>'
                    + '<div class="r-price"><strong>&#x00A5;' + price + '</strong></div>'
                    + '<div class="r-quantity">' + num + '</div>'
                    + '<div class="r-ops"><a class="mr10 re-buy" _id="' + id + '_' + num + '" href="javascript:void(0);" clstag="clickcart|keycount|xincart|reAddedSku">重新购买</a>'+str_select_follow+'</div></div>';
        },

        // 删除商品
        removeSku: function(params, pid, callback, selectstate){
            var actionUrl='';
            if(this.checkSku(pid)){
                actionUrl = this.iurl + "/removeSkuFromCart.action?rd=" + Math.random();
                if(2 == selectstate){
                    actionUrl += "&selectState_=2";
                }
                var productDom = $("#product_" + pid);
                if(productDom) {
                	var handtailor = productDom.attr("handtailor");
                	params += "&skuUuid=" + productDom.attr("skuuuid")
                	+ ((handtailor == "true") ? "&useUuid=true" : "")
                }
                this.updateVenderInfo(actionUrl, params, "删除商品失败", callback);
                // 删除商品日志
                try{
                    var __jda = readCookie("__jda");
                    var uuid = __jda ? __jda.split(".")[1] : false;
                    this.doLog('item','010002', uuid, $.jCookie("pin"), pid, 'del');
                }catch(err){
                }
            } else{
                this.showAlertDlg('对不起，您删除的商品不存在！');
            }
        },

        removeUnableSkuDlg:function(el, batch){
        	var html;
        	if(batch){
        		html = '<div class="tip-box icon-box">'
        			+ '<span class="warn-icon m-icon"></span>'
        			+ '<div class="item-fore">'
        			+ '<h3 class="ftx-04">删除下架商品？</h3><div class="ftx-03"></div>'
        			+ '</div>'
        			+ '<div class="op-btns ac">'
        			+ '<a href="#none" class="btn-9 J_cart-clear-all"'
        			+ '" data-show="" data-bind="' + (el.attr("skuid") || '')
        			+ '" data-name="' + (el.attr("data-name") || '')
        			+ '" data-more="' + (el.attr("data-more") || '')
        			+ '">删除</a>'
        			+ '</div>'
        			+ '</div>';
        	}else{
        		html = '<div class="tip-box icon-box">'
        			+ '<span class="warn-icon m-icon"></span>'
        			+ '<div class="item-fore">'
        			+ '<h3 class="ftx-04">删除下架商品？</h3><div class="ftx-03"></div>'
        			+ '</div>'
        			+ '<div class="op-btns ac">'
        			+ '<a href="#none" class="btn-9 J_cart-remove-new-single" selectstate="' + (el.attr("selectstate") || '')
        			+ '" data-show="" data-bind="' + (el.attr("skuid") || '')
        			+ '" data-name="' + (el.attr("data-name") || '')
        			+ '" data-more="' + (el.attr("data-more") || '')
        			+ '">删除</a>'
        			+ '</div>'
        			+ '</div>';
        	}

                $('body').dialog({
                    title: '删除',
                    width: 400,
                    height: 100,
                    type: 'html',
                    source: html
                });
        },
        
        followSkuDlg: function(el){
            // 1. 单个、数量变为0；2. 删除套装的子商品；（非虚拟组套能删）3.批量选中删除
            var msg = '移动后选中商品将不在购物车中显示。';

            if(!el.hasClass("follow-batch") && el.attr("selectstate") == "1"){
                msg += '操作后，其他商品不享受套装优惠。';
            }

            var bhtml = el.hasClass('follow-batch') ? 'data-batch="true"' : '';
            if(bhtml){
                // 判断是否勾选商品
                if(!$(".item-selected").length){
                    this.showAlertDlg('请至少选中一件商品！');
                    return;
                }
                if($(".item-selected").length>50){
                	this.showAlertDlg('最多只能选50件商品！');
                	return;
                }
            }
            if(bhtml.length==0 && el.attr("ob")=="true"){
	            var html = '<div class="tip-box icon-box">'
                        + '<span class="warn-icon m-icon"></span>'
                        + '<div class="item-fore">'
                        + '<h3 class="ftx-04">移到关注会同时取消常买设置，继续？</h3>'
                        + '</div>'
                        + '<div class="op-btns ac">'
                        + '<a href="#none" class="btn-1 select-follow" selectstate="' + (el.attr("selectstate") || '')
                        + '" data-show="" data-bind="' + (el.attr("id") || '')
                        + '" data-name="' + (el.attr("data-name") || '')
                        + '" data-more="' + (el.attr("data-more") || '')
                        + '" ' + bhtml + '>移到关注</a>'
                        + '<a href="#none" class="btn-9 ml10 cancel-follow">取消</a>'
                        + '</div>'
                        + '</div>';
            }else{
	            var html = '<div class="tip-box icon-box">'
                        + '<span class="warn-icon m-icon"></span>'
                        + '<div class="item-fore">'
                        + '<h3 class="ftx-04">移到关注</h3><div class="ftx-03">' + msg + '</div>'
                        + '</div>'
                        + '<div class="op-btns ac">'
                        + '<a href="#none" class="btn-1 select-follow" selectstate="' + (el.attr("selectstate") || '')
                        + '" data-show="" data-bind="' + (el.attr("id") || '')
                        + '" data-name="' + (el.attr("data-name") || '')
                        + '" data-more="' + (el.attr("data-more") || '')
                        + '" ' + bhtml + '>确定</a>'
                        + '<a href="#none" class="btn-9 ml10 cancel-follow">取消</a>'
                        + '</div>'
                        + '</div>';
            }

            $('body').dialog({
                title: '关注',
                width: 400,
                height: 100,
                type: 'html',
                source: html
            });
        },

        follow: function(pids, bbatch, bremoved, selectstate){
            // 批量移到我的关注
            if(bbatch){
                this.followBatch();
            } else {
                this.followProduct(pids, bremoved, selectstate);
            }
        },

        followBatch: function(){
            var selected = $(".item-selected");
            if(selected && selected.length){// 如果有选中商品
                var html = '';
                var pids = '';
                var removegiftboxids = [];
                $('#cart-list .item-selected').each(function(){
                    var followitem = $('.cart-follow', $(this));
                    if(followitem.length){
                        var id = followitem.attr("id").split("_")[2];
                        var type = followitem.attr("id").split("_")[3];
                         if(type == SkuItemType.Sku || type == SkuItemType.SkuOfManFanPacks || type == SkuItemType.SkuOfManZengPacks){
                            removegiftboxids.push(id);
                         }
                        pids += id + ',';
                    }
                });
                pids = pids.substring(0, pids.length-1);
                this.followDo(pids, null, null, null, null, removegiftboxids.join(","));
            }else{
                this.showAlertDlg('请至少选中一件商品！');
            }
        },

        followProduct:function(pids, bremoved, selectstate){
            // 移到关注；从列表中删除item
            var ss = pids.split("_");
            var venderid = ss[1];
            var id = ss[2];
            var type = ss[3];
            var targetId = 0;
            var packId = 0;
            if(ss.length==5){
                targetId = ss[4];
            }else if(ss.length==6){
                targetId = ss[4];
                packId = ss[5];
            }

            var objel = $('#' + pids);
            var params = "venderId=" + venderid + "&pid=" + id
                        + "&ptype=" + type
                        + "&packId=" + packId
                        + "&targetId=" + targetId
                        + "&t=" +  this.t;
            if(type == SkuItemType.Sku || type == SkuItemType.SkuOfManFanPacks || type == SkuItemType.SkuOfManZengPacks){
                this.followDo(id, objel, bremoved, params, selectstate, id);
            } else {
                this.followDo(id, objel, bremoved, params, selectstate);
            }
        },

        followSkuOnly: function(objel){
            this.followDo(objel.attr("id").split("_")[1], objel, null, null, null, null, true);
        },

        followDo: function(id, objel, bremoved, params, selectstate, removegiftboxids, onlyFollow){
            var me = this;
            if ($("#isLogin").val() == 0) {
                var cartLoginUrl = PurchaseAppConfig.Domain + "/cart?rd="+Math.random() + "&t="+me.t;
                me.doLogin({
                    modal: true,// false跳转,true显示登录注册弹层
                    returnUrl: cartLoginUrl,
                    'clstag1': "login|keycount|5|5",
                    'clstag2': "login|keycount|5|6",
                    complete: function() {
                        me.setLogin();
                        me.followSku(id, objel, bremoved, params, selectstate, function(){
                        	window.location.href=PurchaseAppConfig.Domain + "/?rd=" + Math.random();
                        }, removegiftboxids, onlyFollow);
                    }
                });
            } else {
                me.followSku(id, objel, bremoved, params, selectstate, null, removegiftboxids, onlyFollow);
            }
        },

        followSku: function(pids, objel, bremoved, params, selectstate, callback, removegiftboxids, onlyFollow){
            var me = this;
            if(!pids){
                return;
            }
            $.getJSON("//cart.jd.com/follow.action?skus=" + pids + "&random=" + Math.random() + "&callback=?", function(result) {
                    if(result.success){
                        me.followCountShow(pids.split(",").length);
                        var info = '<div class="op-tipmsg follow-tip" style="position:absolute;width:140px;display:none;color:#71B247;z-index:100;"><span class="s-icon succ-icon"></span>成功'+(onlyFollow?'加':'移')+'到我的关注！</div>';
                        me.showTipInfo(objel, info, false);
                        if (onlyFollow) {
                        	callback && callback();
                        	return;
                        }
                        me.removeGiftCartBox(removegiftboxids, me.getGiftServiceIdsMap());
                        if(objel){
                            // 单品、右侧操作栏
                            if(bremoved){
                                objel.parents('.r-item').remove();
                                if(!$(".cart-removed .r-item").length){
                                    $(".cart-removed").hide();
                                }
                            } else{
                                me.removeSku(params, pids, callback, selectstate);
                            }
                        } else{
                            // 批量删除、底部操作
                            me.updateCartInfo(me.iurl + '/batchRemoveSkusFromCart.action',
                                null,
                                '批量删除商品失败',
                                function(){
                                    if (callback) {callback();}
                                }
                            );
                        }
                    }
                }
            );
        },
        
        // 显示移到我的关注的动画
        followCountShow : function(num) {
            if(num>0 && !this.favoriteDowngrade()) {
                if(this.cartSidebar == null ) {
                	// 我的冰箱屏蔽 侧边栏
                	if(this.t  != this.myfridge ){
                        this.initCartSidebar(function(cs){
                            if(cs) {
                                cs.addFollowCount(num);
                            }
                        });
                	}
                } else {
                    this.cartSidebar.addFollowCount(num);
                }
            }
        },

        initRebuyEvent: function(){
            var me = this;
            $('.cart-warp').delegate('.re-buy', 'click', function(){
                var _this = $(this);
                var ids = _this.attr('_id').split('_');

                // 调用购买接口；
                var pid = ids[0];
                var ptype = 1;
                var num = ids[1];
                var packId = 0;
                var targetId = 0;

                me.jGate(pid, ptype, num, packId, targetId, function(){
                    // 删掉已重新购买的数据
                    _this.parents('.r-item').remove();
                    if(!$(".cart-removed .r-item").length){
                        $(".cart-removed").hide();
                    }
                });
            });
        },

        jGate: function(pid,ptype,num,packId,targetId,callback, callbackParam){
            if(this.checkSku(pid)){
                var param = "pid=" + pid
                            + "&ptype=" + ptype
                            + "&pcount=" + num
                            + "&packId=" + packId
                            + "&targetId=" + targetId
                			+ "&f=3"
                			+ "&fc=1"
                			+ "&t=" + this.t;
                var me = this;

                jQuery.ajax({
                    type     : "POST",
                    dataType : "json",
                    url  : this.iurl+'/gate.action',
                    data : param  + "&outSkus=" + this.outSkus  +"&random=" + Math.random() + "&locationId=" + this.ipLocation + "&callback=?",
                    success : function(result) {
                	    me.setLogin(result);
                        if(result && result.l == 1){
                            me.goToLogin();
                            return;
                        }

                        if(result && result.url){
                            window.location.href= result.url;
                            return;
                        }

                        if(result && result.flag){
                        	var rcd = result.rcd;
                            if( rcd == "2" || rcd == 2){
                                $.closeDialog();
                                me.showAlertDlg("添加商品失败,已超出购物车最大容量!");
                                return;
                            }else if(rcd == "3" || rcd == 3){
                                $.closeDialog();
                                me.showAlertDlg("添加商品失败,商品数量超限!"); // getParam(em)
                                return ;
                            }else if(rcd == "0" || rcd == 0){
                                $.closeDialog();
                                me.showAlertDlg('添加商品失败');
                                return;
                            }
                            if(callbackParam){
                            	me.updateCartInfo(me.iurl + '/jcart' , callbackParam , '获取购物车失败' , callback );
                            	return;
                            }
                            me.updateCartInfo(me.iurl + '/jcart' , null , '获取购物车失败' , null );
                            if(callback){
                                callback();
                            }

                        }else{
                            $("#cart-loading-dialog").hide();
                            var errorMessage = "添加商品失败";
                            var rem=result.em;
                            if(rem.indexOf("@_@") != -1){// @_@是后台传值的约定
                                errorMessage = "商品数量不能大于" + rem.split("@_@")[1] + "。";
                            }

                            if(errorMessage){
                                me.showAlertDlg(errorMessage);
                            }
                        }
                    },
                    error:function(XMLHttpResponse ){
                    }
                });
            } else{
                this.showAlertDlg('对不起，您添加的商品不存在！');
            }
        },
		initCrossGift: function(promotionId){
			var pnode = $('#gift_box_'+promotionId);
			if ($('.num', pnode).text() != "") {
				return;
			}
        	var num = 0 , price = 0;
            $('.p-item', pnode).each(function(){
            	if ($(this).find('input[type="checkbox"]').prop('checked')) {
            		num ++;
            		price = PurchaseAppConfig.add(price, $(this).find('.p-price').attr('data'));
            	}
            });
            $('.num', pnode).html(num);
            $('.price', pnode).html('¥' + PurchaseAppConfig.tofix(price));
		},
		writeCrossGift: function(promotionId){
			var pnode = $('.ui-dialog .cross-box');
        	var promotionId = pnode.attr('id').substring(pnode.attr('id').lastIndexOf('_')+1);
        	$('#cross_'+promotionId).html(pnode.prop('outerHTML'));
		},
        initGiftEvent: function(){
            var me = this;

            // 初始化 领取赠品、更换商品
            $('.cart-warp').delegate('a.trade-btn', 'click', function(event){
                me.clearDialog();

                var pnode = $(this).parents('.item-full');
                var giftEl = $('.gift-box', pnode);

                if(me.isLowIE()){
                    $(this).closest('.item-header').parent().css('z-index', 3);
                }

                // todo @tongen IE7
                giftEl.css('top', this.offsetTop + 'px');
                giftEl.css('left', (this.offsetLeft + this.offsetWidth + 10) + 'px');
                giftEl.show();

                var arrawEle = giftEl.find('.gift-arr');

                toFixUpLoc($(this), giftEl, arrawEle);
                toFixDownLoc(giftEl, arrawEle);

                // 已勾选商品数
                var selnum = $('.gift-goods input:checked', giftEl).length;
                $('.gift-mt .num', giftEl).html(selnum);

                if($(this).html().indexOf('换购') != -1){
                    me.doLog('newcart', 'clickcart','huangouclick');
                } else {
                    me.doLog('newcart', 'clickcart','zengpinclick');
                }
                var clickEle = this;
                if(!$(clickEle).attr("hasStock")){
	                if(me.unfindStockState) {
	                	$('.gift-box .gift-goods .item-gift', pnode).each(function(){
	                		var id = $(this).attr("skuid");
	                		var skus = me.outSkus.split(',');
                            for(var i in skus){
                                if(skus[i] == id){
                                    $('.p-img',this).append('<span class="stock-state">无货</span>');
                                    return;
                                }
                            }
	                	});
	                	$(clickEle).attr("hasStock","1");
	                } else {
	                	var skuNum ='';
	                	$('.gift-box .gift-goods .item-gift', pnode).each(function(){
	                		skuNum += $(this).attr("skuid") + ",1;";
	                	});
	                	var storeUrl = me.getStoreUrl(skuNum);
	                    if (storeUrl) {
		                    $.getJSON(storeUrl, function(result) {
		                        if(!result) {
		                            return;
		                        }
		                        $('.gift-box .gift-goods .item-gift', pnode).each(function() {
		                        	var id = $(this).attr("skuid");
		                            var state = result[id];
		                            var info;
		                            if (state.a == "33" || state.a == "40") {
		                            	return;
		                            } else if (state.a == "36") {
		                            	if (state.u && state.u == "1") {
		                            		return;
		                            	}
		                            	info = "采购中"
		                            } else {
		                            	info = "无货";
		                            }
			                        var skus = me.outSkus.split(',');
	                                for(var i in skus){
	                                    if(skus[i] == id){
	                                    	info = "无货";
	                                        break;
	                                    }
	                                }
	                                $('.p-img',this).append('<span class="stock-state">' + info + '</span>');
		                        });
		                        $(clickEle).attr("hasStock","1");
		                    });
	                    }
	                }
                }
                event.stopPropagation();
                return false;
            });

            $('.cart-warp').delegate('.gift-box input[type=checkbox]', 'click', function(){
                var pnode = $(this).parents('.gift-box');
                var promotionId = pnode.attr('id');
                promotionId = promotionId.substring(promotionId.lastIndexOf('_')+1);

                // 最多可以换购、领取的赠品数
                var maxnum = $('#gift_num_' + promotionId).val();
                var selnum = $('.gift-goods input:checked', pnode).length;

                if(selnum > maxnum){
                    $(this).prop('checked', false);
                    selnum = maxnum;
                    // 弹出小浮层，2秒后消失
                    var info = '<div class="op-tipmsg" style="position:absolute;left:40px;top:100px;z-index:100;display:none;"><span class="s-icon warn-icon"></span>最多可选择' + maxnum + '件~</div>';
                    me.showTipInfo($(this), info, true);
                }

                $('.gift-mt .num', pnode).html(selnum);
            });

            $('.cart-warp').delegate('a.select-gift', 'click', function(){
                var pnode = $(this).parents('.gift-box');
                var promotionId = pnode.attr('id');
                promotionId = promotionId.substring(promotionId.lastIndexOf('_')+1);

                // 最多可以换购、领取的赠品数
                var maxnum = $('#gift_num_' + promotionId).val();
                var selnum = $('.gift-goods input:checked', pnode).length;
                if(selnum > maxnum){
                    return;
                }

                var checks = $('.gift-goods input', pnode);
                var giftsid = '';
                for(var i=0,l=checks.length; i<l; i++){
                    var el = checks[i];
                    if($(el).prop('checked')){
                        giftsid += $(el).attr('id') + ',';
                    }
                }
                giftsid = giftsid.substring(0, giftsid.length-1);

                me.updateGifts(giftsid, promotionId);
                me.closeTipInfo();
            });

            $('.cart-warp').delegate('a.cancel-gift', 'click', function(){
                $(this).closest('.gift-box').hide();
                me.closeTipInfo();
                if(me.isLowIE()){
                    $(this).closest('.gift-box').parent().css('z-index', 'auto');
                }
            });

            $('.cart-warp').delegate('.gift-box .close', 'click', function(){
                $(this).parents('.gift-box').hide();
                me.closeTipInfo();
                if(me.isLowIE()){
                    $(this).closest('.gift-box').parent().css('z-index', 'auto');
                }
            });
			$('.cart-warp').delegate('a[id^="huangou_"]', 'click', function(){
				var promotionId = this.id.substring(this.id.lastIndexOf('_')+1);
				me.initCrossGift(promotionId);
				var clickEle = this;
				var waitStore = false;
                if(!$(clickEle).attr("hasStock")){
	                if(me.unfindStockState) {
	                	$('.p-item', '#cross_'+promotionId).each(function(){
	                		var id = $(this).attr("skuid");
	                		var skus = me.outSkus.split(',');
                            for(var i in skus){
                                if(skus[i] == id){
                                    $('.p-img',this).append('<span class="p-nostock-mask">无货</span>');
                                    return;
                                }
                            }
	                	});
	                	$(clickEle).attr("hasStock","1");
	                } else {
	                	var skuNum ='';
	                	$('.p-item', '#cross_'+promotionId).each(function(){
	                		skuNum += $(this).attr("skuid") + ",1;";
	                	});
	                    var storeUrl = me.getStoreUrl(skuNum);
	                    if (storeUrl) {
	                    	waitStore = true;
		                    $.getJSON(storeUrl, function(result) {
		                        if(!result) {
		                            return;
		                        }
		                        $('.p-item', '#cross_'+promotionId).each(function() {
		                        	var id = $(this).attr("skuid");
		                            var state = result[id];
		                            var info;
		                            if (state.a == "33" || state.a == "40") {
		                            	return;
		                            } else if (state.a == "36") {
		                            	if (state.u && state.u == "1") {
		                            		return;
		                            	}
		                            	info = "采购中"
		                            } else {
		                            	info = "无货";
		                            }
			                        var skus = me.outSkus.split(',');
	                                for(var i in skus){
	                                    if(skus[i] == id){
	                                    	info = "无货";
	                                        break;
	                                    }
	                                }
	                                $('.p-img',this).append('<span class="p-nostock-mask">' + info + '</span>');
		                        });
		                        $(clickEle).attr("hasStock","1");
		                        $('body').dialog({
		        		            title: '选择换购商品',
		        		            width: 570,
		        		            type: 'text',
		        		            onBeforeClose: function(){me.writeCrossGift()},
		        		            source: $('#cross_'+promotionId).html()
		        		        });
		                    });
	                    }
	                }
                }
                if (!waitStore){
	            	$('body').dialog({
			            title: '选择换购商品',
			            width: 570,
			            type: 'text',
			            onBeforeClose: function(){me.writeCrossGift()},
			            source: $('#cross_'+promotionId).html()
			        });
                }
            });
            $('body').delegate('.ui-dialog .cross-p-items input[type=checkbox]', 'click', function(){
                var box = $(this);
                if (box.prop('checked')) {
                	box.attr('checked','checked');
                } else {
                	box.removeAttr('checked');
                }
                var pnode = box.parents('.cross-box');
                var promotionId = pnode.attr('id').substring(pnode.attr('id').lastIndexOf('_')+1);
                var num = 0 , price = 0;
                $('.p-item', pnode).each(function(){
                	if ($(this).find('input[type="checkbox"]').prop('checked')) {
                		num ++;
                		price = PurchaseAppConfig.add(price,$(this).find('.p-price').attr('data'));
                	}
                });
                // 最多可以换购、领取的赠品数
                var maxnum = $('#gift_num_' + promotionId, pnode).val();
                if (num > maxnum) {
                    box.prop('checked', false);
                    box.removeAttr('checked');
                    var info = '<div class="op-tipmsg" style="position:absolute;left:40px;top:100px;z-index:10001;display:none;"><span class="s-icon warn-icon"></span>最多可选择' + maxnum + '件~</div>';
                    me.showTipInfo(box, info, true);
                } else {
	                $('.num', pnode).html(num);
	                $('.price', pnode).html('¥'+PurchaseAppConfig.tofix(price));
                }
            });
            $('body').delegate('.ui-dialog .cancel-huangou', 'click', function(){
            	me.writeCrossGift();
                $.closeDialog();
            });
			$('body').delegate('.ui-dialog .huangou', 'click', function(){
                var pnode = $(this).parents('.cross-box');
            	var promotionId = pnode.attr('id').substring(pnode.attr('id').lastIndexOf('_')+1);
            	var giftIds = [];
                $('input[type="checkbox"]', pnode).each(function(){
                	if ($(this).prop('checked')) {
                		giftIds.push(this.id.substring(this.id.lastIndexOf('_')+1));
                	}
                });
                me.updateGifts(giftIds.length > 0 ? giftIds.join(',') : null, promotionId);
                $.closeDialog();
            });
        },

        updateGifts: function(giftsid, promotionId){
            var me = this;
            var act = giftsid ? '/addGiftsOfMZ.action' : '/clearGiftsOfMZ.action';
            var params = "pid=" + giftsid
                        + "&promoID=" + promotionId
                        + "&t=" + this.t 
                        + "&random=" + Math.random();

            this.updateProductInfo(this.iurl + act,
                                    params,
                                    '添加赠品失败',
                                    function(){
                                        $('#gift-box_' + promotionId).hide();
                                        if(me.isLowIE()){
                                            $('#gift-box_' + promotionId).parent().css('z-index', 'auto');
                                        }
                                    }
                                );
        },

        removeGift: function(rid){
            var ss = rid.split('_');
            var pid = ss[1];
            var ptype = ss[2];
            var promoId = ss[3];

            var params = 'pid=' + pid
                        + '&ptype=' + ptype
                        + '&promoID=' + promoId
                        + "&t=" + this.t 
                        + "&random=" + Math.random();

            this.updateProductInfo(this.iurl + '/removeGiftOfMZ.action',
                                params,
                                '删除赠品失败'
                                );
        },
        
        startDDClient: function(venderId){
        	var startDD = function(venderId){
        		var pin = $.jCookie("pin");
        		try{
        		    startClient(pin, 0, venderId, 0);
                }catch(e){
                }
        	}
        	if ($("#isLogin").val() == 0) {
        		var me = this;
                me.doLogin({
                    modal: true,// false跳转,true显示登录注册弹层
                    'clstag1': "login|keycount|5|5",
                    'clstag2': "login|keycount|5|6",
                    firstCheck: false,
                    complete: function() {
                	    me.updateCartInfo(me.iurl + '/jcart' , null , '获取购物车失败' , null );
                	    me.setLogin();
                	    startDD(venderId);
                    }
                });
            } else {
            	startDD(venderId);
            }
        },

        initCouponsEvent: function(){
        	var me = this;
        	// pop优惠券
        	// 将此修改为只匹配前半部。pop优惠券和自营优惠券使用同一class，避免点击优惠券时候冲突
            $('.cart-warp').delegate('a[id^="coupon_"]', 'click', function(event){
        		me.clearDialog();
        		var venderId = this.id.split("_")[1];
        		if ($("#isLogin").val() == 0) {
                    me.doLogin({
                        modal: true,// false跳转,true显示登录注册弹层
                        'clstag1': "login|keycount|5|5",
                        'clstag2': "login|keycount|5|6",
                        firstCheck: false,
                        complete: function() {
                    	    me.updateCartInfo(me.iurl + '/jcart' , null , '获取购物车失败' , null );
                    	    me.setLogin();
                    	    // try{me.loadCoupons(venderId);}catch(e){}
                        }
                    });
                } else {
                	me.loadCoupons(venderId);
                }
				event.stopPropagation();
				return false ;
        	});
            
            // 自营优惠券
        	$('.cart-warp').delegate('#J_zypromo_btn', 'click', function (event){
        		me.clearDialog();
        		if ($("#isLogin").val() == 0) {
            		me.doLogin({
            			modal: true,// false跳转,true显示登录注册弹层
            			'clstag1': "login|keycount|5|5",
            			'clstag2': "login|keycount|5|6",
            			firstCheck: false,
            			complete: function() {
            			me.updateCartInfo(me.iurl + '/jcart' , null , '获取购物车失败' , null );
            			me.setLogin();
            		}
            		});
            	} else {
            		me.loadCoupons(8888);
            	}
				event.stopPropagation();
        	});
        },
        
        /**
		 * 优惠券列表
		 */
        loadCoupons: function(venderId){
        	
        	try {
        		var me = this ;
	        	var zyShowCoupons = function(me){
        			var target = $("#J_zypromo_btn");
        			var offset = target.position();
        			$('#J_zypromo_div').css('left', (offset.left) + 'px');
        			$('#J_zypromo_div').css('top', (offset.top + 36) + 'px');
        			$('#J_zypromo_div').slideDown(200);
        			if(me.isLowIE()){
        				target.closest('.item-item').parent().css('z-index', 10);
        				target.closest('.item-item').css('z-index', 20);
        			}
	        	}
	        	
        		var popShowCoupons = function(me){
        			me.clearDialog();
        			var target = $("#coupon_"+venderId);
        			var offset = target.position();
        			$("#promotion-ctips_"+venderId).css('left', (offset.left) + 'px');
        			$("#promotion-ctips_"+venderId).css('top', (offset.top + 36) + 'px');
        			$("#promotion-ctips_"+venderId).slideDown(200);
        			if(me.isLowIE()){
        				target.closest('.item-item').parent().css('z-index', 10);
        				target.closest('.item-item').css('z-index', 20);
        			}
        			
        			me.doLog('newcart', 'clickcart','couponsclick');
        			// event.stopPropagation();
        		};

        		// 是否直接展示
        		var isShowCoupons = function(me, venderId) {
        			// 自营
            		if (venderId == 8888) {
        	        	if ($("#J_zypromo_div").length > 0) {
        	        		zyShowCoupons(me);
        	        		return true;
        	        	}

            		} else { // pop
                		if ($("#promotion-ctips_"+venderId).length > 0) {
                			popShowCoupons(me);
                			return true;
                		}
            		}
            		return false;
        		}
        		
        		var getDisCouponInfo = function (disList, high) {
        			var result = [];
        			// 消除小数运算精度问题
        			var discountNum = disList[0].discount * 10;
        			if (!(Math.floor(discountNum) === discountNum)) {
        				discountNum = Number(discountNum).toFixed(1);
        			}
        			if (disList.length == 1) {
        				result.push(discountNum + '折');
        				result.push('满' + disList[0].quota + '享' + result[0]);
        				result.push(result[1] + '，最多减¥' + high);
					} else {
						result.push(disList[disList.length-1].discount * 10+'~'+discountNum+'折');
						result.push('满' + disList[0].quota + '享' + discountNum + '折');
						var hoverDesc = '';
						for (var i in disList) {
							hoverDesc += '满' + disList[i].quota + '享' + disList[i].discount * 10 + '折，';
						}
						hoverDesc += '最多减¥' + high;
						result.push(hoverDesc);
					}
        			return result;
        		}
        		
        		//每满减
        		var isEveryfullminus = function(coupon){
        			if(coupon.couponStyle == 28){
        				return true;
        			}
        			return false;
        		}
        		
        		//头号京贴
        		var isJingTieNumOne = function(coupon){
        			if(coupon.couponStyle == 28 && coupon.businessLabel == 204 && coupon.couponKind == 1){
        				return true;
        			}
        			return false;
        		}
        		
        		// 解析优惠券列表请求结果
        		var couponResultParse = function(me, venderId, skuCid, result) {
        			result = result.couponResult;
        			if (result && result.success && result.couponSets && result.couponSets.length > 0) {
    					var couponSets = result.couponSets;
    					if (venderId == 8888) {
    						$("span[name='J_zyshop_8888']").remove();
    						var couponHtml ='<span class="shop-coupon" name="J_zyshop_8888"><a class="shop-coupon-btn" id="J_zypromo_btn" href="javascript:;" clstag="pageclick|keycount|201508251|19">优惠券</a><div class="promotion-tips promotion-discount-ctips" id="J_zypromo_div"><div class="promotion-tit">优惠券<b></b></div>';
    						var itemsSelectedIds = $("#ids").val();
    						var combiedStr,conponSkusStr,skus,zycoupon,vskuImgMap={};
    						var disCouponInfo,disCouponTitle,disCouponDesc;
    						$("div.suit-name").each(function(i, o){
    							if($(o).attr("vSkuId") != "") {
    								vskuImgMap[$(o).attr("vSkuId")] = $(o).attr("vSkuImg");
    							}
    						});
    						for (var i = 0; i < couponSets.length; i++){
    							zycoupon = couponSets[i];
    							if (i == 0) {
    								if(zycoupon.skuSelected) {
    									couponHtml += '<div class="promotion-cont"><div class="p-coupon-tit"><span>已选商品可用优惠券</span></div>';
    								} else {
    									var hasSelected = false;
    									var zySkuCids = skuCid.split(",");
    									for (var zySkuCidNo = 0; zySkuCidNo < zySkuCids.length; zySkuCidNo++) {
    										if (zySkuCids[zySkuCidNo].split("_")[2] == "1") {
    											hasSelected = true;
    											break;
    										}
    									}
    									if (hasSelected) {
    										couponHtml += '<div class="promotion-none-tips"><span>您勾选的商品暂无优惠券可用，看看其他优惠券吧~</span></div>';
    									}
    									couponHtml += '<div class="promotion-cont"><div class="p-coupon-tit"><span>未勾选商品可用优惠券</span></div>';
    								}
    							} else {
    								if (couponSets[i-1].skuSelected && !zycoupon.skuSelected) {
    									couponHtml += '<div class="p-coupon-tit"><span>未勾选商品可用优惠券</span></div>';
    								}
    							}
    							combiedStr = '';
    							conponSkusStr = [];
    							skus = zycoupon.skus;
    							for(var j = 0; j < skus.length; j++){
    								if(!combiedStr && itemsSelectedIds){
    									if(zycoupon.couponKind != 0 && itemsSelectedIds.indexOf(skus[j]) >= 0 && !me.isOverseasLoc() && me.t != me.myfridge ){ // 屏蔽已领取全品券
    										var bId = zycoupon.batchId ? zycoupon.batchId : zycoupon.batchIdL;
    										combiedStr = '<span class="cextra ml20"><a target="_blank" href="//search.jd.com/Search?coupon_batch='+bId+'">去凑单</a><i></i></span>';
    									}
    								}
    								var _imgsrc = null;
    								if (vskuImgMap[skus[j]]) {
    									_imgsrc = vskuImgMap[skus[j]];
    								} else {
    									var oj = $('.J_zyyhq_'+skus[j]).children('img');
    									if(oj.length) {
    										_imgsrc = oj.first().attr('src');
    									}
    								}
    								if(_imgsrc) {
    									conponSkusStr.push('<li><div class="cp-item-img">'+
    									'<a href="//item.jd.com/'+skus[j]+'.html" target="_blank" clstag="pageclick|keycount|201508251|22">' +
    									'<img src="'+_imgsrc.replace('s80x80', 's48x48')+'"></a></div></li>');
    								}
    							}
    							var taked = (zycoupon.taked) ? '<a class="ftx-03" href="javascript:;">已领取</a>':'<a href="javascript:;" id="acoupon_'+(zycoupon.encryptedKey)+'_'+(zycoupon.roleId)+'" class="btn-1 coupon-btn" clstag="pageclick|keycount|201508251|20">领取</a>';
    							var disCouponInfo;
    							if (zycoupon.disCoupon) {
    								disCouponInfo = getDisCouponInfo(zycoupon.disInfo.info, zycoupon.disInfo.high);
    							}
    							couponHtml +=
    								'<div class="p-coupon-item' + (zycoupon.taked ? ' p-coupon-item-gray">' : '">') +
    									'<div class="coupon-price">'+
    										'<span class="txt">' + (zycoupon.disCoupon ? disCouponInfo[0] : '¥' + zycoupon.discount) + '</span>' +
    									'</div>' +
    									'<div class="coupon-msg">' + 
    										'<div>' +
    											'<span class="ctype">'+(0 == zycoupon.type ? '京券' : (1 == zycoupon.type ? '东券' : (2 == zycoupon.type ? '免运费券' : '')))+' </span>' +
    											(zycoupon.disCoupon ? ('<span class="cinfo" title="' + disCouponInfo[2] + '"> ' + disCouponInfo[1] + '</span>') : ('<span class="cinfo"> '+((zycoupon.quota) ? (((isJingTieNumOne(zycoupon)||isEveryfullminus(zycoupon))?'每':'')+'满¥'+(zycoupon.quota) ): '')+'减¥'+(zycoupon.discount)+'</span>')) + 
    											combiedStr +
    										'</div>' + 
    										((zycoupon.overlap == 2||isJingTieNumOne(zycoupon)||isEveryfullminus(zycoupon)) ? '<span class="coverlay fl" title="' + zycoupon.overlapDesc + '">可叠加</span>' : '') +
    										'<div class="ftx-03 J_cpitems" clstag="pageclick|keycount|201508251|21" title="'+(zycoupon.name)+'">'+(zycoupon.name)+'</div><i class="zyc-ico"></i>' +
    									'</div>' +
    									'<div class="coupon-opbtns">' + taked + '</div>'+
    									'<div class="cpitems hide"><ul>' + conponSkusStr.join("") + '</ul></div>' + 
    								'</div>';
    						}
    						couponHtml += '</div></div></span>';
    						$("#vender_8888").find(".shop-txt").after(couponHtml);
    						zyShowCoupons(me);
    					} else {
    						var couponHtml ="";
    						for(var i=0; i<couponSets.length; i++){
    							var coupon = couponSets[i];
    							var type = coupon.type==0 ? "京券" : "东券";
    							var discount = coupon.discount;
    							var quota = coupon.quota;
    							var beginTime = coupon.beginTimeStr;
    							var endTime = coupon.endTimeStr;
    							var cKey = coupon.encryptedKey;
    							var cRoleId = coupon.roleId;
    							var taked = coupon.taked ? '<a class="ftx-03" href="javascript:;">已领取</a>':'<a class="btn-1 coupon-btn" clstag="pageclick|keycount|cart__201503041|14" id="acoupon_'+cKey+'_'+cRoleId+'" href="javascript:;">领取</a>';
    							var disCouponInfo;
    							if (coupon.disCoupon) {
    								disCouponInfo = getDisCouponInfo(coupon.disInfo.info, coupon.disInfo.high);
    							}
    							couponHtml += 
    								'<div class="p-coupon-item' + (coupon.taked ? ' p-coupon-item-gray' : '')+'">'+
    									'<div class="coupon-price">'+
    										'<span class="txt">' + (coupon.disCoupon ? disCouponInfo[0] : '¥' + discount) + '</span>' +
    									'</div>'+
    									'<div class="coupon-msg">'+
    										(coupon.disCoupon ? ('<div title="' + disCouponInfo[2] + '">'+type+','+ disCouponInfo[1] +'</div>') : ('<div>'+type+','+((isJingTieNumOne(coupon)||isEveryfullminus(coupon))?'每':'')+'满¥'+ quota +'减¥'+discount+'</div>')) + 
    										((coupon.overlap == 2||isJingTieNumOne(coupon)||isEveryfullminus(coupon)) ? '<span class="coverlay fl" title="' + coupon.overlapDesc + '">可叠加</span>' : '') +
    										(beginTime && endTime? '<div class="ftx-03">'+beginTime+'-'+endTime+'</div>': '') +
    									'</div>'+
    									'<div class="coupon-opbtns">' + taked + '</div>'+
    								'</div>';
    						}
    						couponHtml = 
    							'<div style="display:none;left:0" id="promotion-ctips_'+venderId+'" class="promotion-tips promotion-discount-ctips">'+
    								'<div class="promotion-tit">优惠券<b></b></div>'+
    								'<div class="promotion-cont">'+ couponHtml + '</div>' + 
    							'</div>';
    						$("#coupon_"+venderId).after($(couponHtml));
    						popShowCoupons(me);
    					}
        			}
        		}
        		
        		// 是否直接展示
        		if (isShowCoupons(me, venderId)) {
        			return;
        		}
        		var skuCid = $('#couponParam').val();
                if(!skuCid) return;
        		jQuery.ajax({
        			type : "GET",
        			async : true,
        			dataType : "json",
        			url  : this.iurl + '/getCoupons.action',
        			data : {skuCid : skuCid, venderId : venderId, random : Math.random()},
        			success : function(result) {
        				couponResultParse(me, venderId, skuCid, result);
        			},
        			error:function(XMLHttpResponse ){
        				$("span[name='J_zyshop_8888']").remove();
        			}
        		});
        	} catch(e){};
			
        },

        /**
		 * 领取优惠券
		 */
        receiveCoupon: function(couponId){
        	var me = this;
        	$('#'+ couponId).removeClass().addClass("ftx-03").html("已领取");
        	$('#'+ couponId).parent().parent().removeClass().addClass("p-coupon-item p-coupon-item-gray");
            var e = typeof eid == "undefined" ? "" : eid;
            var f = typeof fp == "undefined" ? "" : fp;
            var shf = typeof shfp == "undefined" ? "" : shfp;
        	var receive = function(cKey,cRoleId){
        		jQuery.ajax({
                    type     : "POST",
                    async : true,
                    dataType : "json",
                    url  : me.iurl + '/receiveCoupon.action',
                    data : {couponKey:cKey, couponRoleId:cRoleId, random:Math.random(), t:me.t,
                        eid:e, fp:f,shfp:shf[0], shfpa:shf[1], shfpb:shf[2]},
                    success : function(result) {
                        result = result.couponResult;
                        if(result && !result.success){
                    		$('#'+ couponId).removeClass().addClass("btn-1 coupon-btn").html("领取");
                        	$('#'+ couponId).parent().parent().removeClass().addClass("p-coupon-item");
                        	if(result.resultCode == 54) {
                        		$('body').dialog({
                                    title: null,
                                    width: 418,
                                    height: 230,
                                    type:'html',
                                    fixed: true,
                                    source:'<div class="ui-dialog-content"><div class="cart-warn-sysdialog ac">' +
                                                '<i class="warn-tip-ico"></i><p class="tit">' + result.msg + '</p>' +
                                                '<p><a href="//authpay.jd.com/auth/toAuthPage?source=800&directReturnUrl=//cart.jd.com" class="btn-1 mt20">去认证</a></p>' +
                                            '</div></div>' +
                                            '<a class="ui-dialog-close" title="关闭"><span class="ui-icon ui-icon-delete"></span></a>'
                                });
                        	} else if(result.msg) {
                        		me.showAlertDlg(result.msg)
                        	};
                        }
                    },
                    error:function(XMLHttpResponse ){}
                });
        	};
        	var cKey = couponId.split("_")[1];
        	var cRoleId = couponId.split("_")[2];
        	if ($("#isLogin").val() == 0) {
        		me.doLogin({
        			modal: true,// false跳转,true显示登录注册弹层
        			'clstag1': "login|keycount|5|5",
        			'clstag2': "login|keycount|5|6",
        			firstCheck: false,
        			complete: function() {
        			me.updateCartInfo(me.iurl + '/jcart' , null , '获取购物车失败' , null );
        			me.setLogin();
        			try{
        				receive(cKey,cRoleId);
        			}catch(e){}
        		}
        		});
        	} else {
        		receive(cKey,cRoleId);
        	}
        },
        
        // 单品自带赠品，无货时删除
        removeSelfgift: function(id){
            var ss = id.split("_");
            var pid = ss[0];
            var targetId = ss[1];
            var ptype = ss[2];
            var promoID = ss[3];

            if(this.checkSku(targetId)){
                var params = "pid=" + pid
                            + "&targetId=" + targetId
                            + "&ptype=" + ptype
                            + "&promoID=" + promoID
                            + "&t=" + this.t
                            + "&outSkus=" + this.outSkus
                            + "&rd=" + Math.random();

                this.updateProductInfo(this.iurl + '/removeGiftFromCart.action',
                    params,
                    '删除赠品失败'
                    );
            } else{
                this.showAlertDlg('对不起，您删除的赠品不存在！');
            }
        },

        // 单品自带赠品，有货时还原
        resumeSelfgift: function(id){
            var ss = id.split("_");
            var pid = ss[0];
            var ptype = ss[1];
            var promoID = ss[2];

            if(this.checkSku(pid)){
                var params = "pid=" + pid
                            + "&ptype=" + ptype
                            + "&promoID=" + promoID
                            + "&t=" + this.t
                            + "&outSkus=" + this.outSkus
                            + "&rd=" + Math.random();

                this.updateProductInfo(this.iurl + '/backGiftFromCart.action',
                    params,
                    '恢复赠品失败'
                    );
            } else{
                this.showAlertDlg('对不起，主商品不存在！');
            }
        },

        initHandtailorEvent: function(){
        	var me = this;
        	$('.cart-warp').delegate('a.jd-recustomize', 'click', function(){
        		me.clearDialog();
        		var handtailorDialog = $(this).closest('.promise');
        		handtailorDialog.next().removeClass('hide');
        		handtailorDialog.next().css('top', ($('.jd-recustomize-icon', handtailorDialog).position().top + 19) + 'px');
        		handtailorDialog.next().css('left', ($('.jd-recustomize-icon', handtailorDialog).position().left - 6) + 'px');
        	});
        	// 修改专属定制按钮
        	$('.cart-warp').delegate('div.recustomize-dialog a.btn-1', 'click', function(){
        		var productDom = $(this).closest('.item-item');
        		var skuid = productDom.attr("skuid");
        		var homeServiceId = "";
        		var ybServiceId = "";
        		var mnode = productDom.find('[_yanbao].promise');
        		if(mnode != null){
        			var pids = mnode.attr('_yanbao').split('_');
                	var sids = mnode.attr('_service').split('_');
                	var isproduct = mnode.attr('isproduct');
                	var data ;
                	if(me.ybobjs[pids[1] + '_' + pids[2]]){
                		data = me.ybobjs[pids[1] + '_' + pids[2]].data;
                	}
	                var sdate ='';
	                var type = '';// 1单品，2套装 3虚拟组套
	                if(isproduct == "1"){
	                	type = 1;
	                	if(me.jdhsobjs[sids[1] + '_' + '_']){
	                		sdate = me.jdhsobjs[sids[1] + '_' + '_'].data;
	                	}
                	}else{
                		if(sids[2]){
                			type = 3;
                			if(me.jdhsobjs[sids[1] + '_' + sids[2] + '_']){
                				sdate = me.jdhsobjs[sids[1] + '_' + sids[2] + '_'].data;
                			}
                		}else{
                			type = 2;
                			if(me.jdhsobjs[sids[1] + '_' + '_' + pids[2]]){
                				sdate = me.jdhsobjs[sids[1] + '_' + '_' + pids[2]].data;
                			}
                		}
                	}
	                if(data){
	                	for(var i=0,yanbaoGroups=data.platformGroups,groupslen=yanbaoGroups.length; i<groupslen; i++){
	                		var nowGroup = yanbaoGroups[i];
	                		var groupItems = nowGroup.platformConfigVOs;
	                		// 拼接每个group下的服务项目
	                		for(var j=0,itemslen=groupItems.length; j<itemslen; j++){
	                			if(groupItems[j].selected){
	                				if(ybServiceId == ""){
	                					ybServiceId += groupItems[j].platformId
		                			}else{
		                				ybServiceId += "," + groupItems[j].platformId
		                			}
	                			}
	                		}
	                	}
	                }
        			if(sdate){
        				for(var i=0,sGroups=sdate.jdHomeServiceGroups,groupslen=sGroups.length; i<groupslen; i++){
                			var nowGroup = sGroups[i];
                			var groupItems = nowGroup.jdHomeServiceInfos;
                			for(var j=0,itemslen=groupItems.length; j<itemslen; j++){
                				if(homeServiceId == ""){
                					homeServiceId += groupItems[j].serviceSkuId;
                				}else{
                					homeServiceId += "," + groupItems[j].serviceSkuId;
                				}
                			}
                		}
        			}
        		}
        		
        		if(ybServiceId != null && ybServiceId != ''){
        			ybServiceId = ("&ybServiceId=" + ybServiceId);
        		}
        		
        		if(homeServiceId != null  && homeServiceId != ''){
        			homeServiceId = ("&homeServiceId=" + homeServiceId);
        		}
        		
        		var param = "skuId=" + skuid + "&skuUuid=" + productDom.attr("skuuuid") +
        					"&customInfoId=" + productDom.attr("customInfoId") + ybServiceId + homeServiceId;
				jQuery.ajax({
					type  : "GET",
					dataType : "jsonp",
					url  : "//bespoke.jd.com/bespokeAddress/queryBespokeAddress",
					data : param,
					jsonpCallback: "jsonpCall",
					success : function(result) {
						if(result.bespokeUrl) {
							window.location.href = result.bespokeUrl;
						}
					},
					error:function(XMLHttpResponse){
						
					}
				});
        	});
        	// 取消按钮
        	$('.cart-warp').delegate('div.recustomize-dialog a.btn-9', 'click', function(){
        		$(this).closest('.recustomize-dialog').addClass('hide');
        	});
        },
        
        initGiftcardEvent: function(){
            var me = this;
            $('.cart-warp').delegate('a.gift-packing', 'click', function(){
                me.clearDialog();
                if(me.giftServiceDowngrade()) {
                    var giftcardDialog = $('.giftcardbox-dialog', $(this).parents('.p-extend'));
                    if(giftcardDialog && giftcardDialog.length>0) {
                        giftcardDialog.remove();
                    }
                    var selectgiftcart, pextendobj, productitem,pid;
                    var  giftboxopsa = $('.giftbox-ops a', $(this).closest('.item-item'));
                    if(giftboxopsa && giftboxopsa.length>0) {
                        selectgiftcart = giftboxopsa.attr("id");
                    }
                    pextendobj = $(this).closest('.p-extend');
                    productitem = $(this).closest('.item-item');
                    var pgiftcardobj = $(this).closest('.promise');
                    pid = $(this).closest('.promise').attr('_giftcard').split('_')[1];
                    jQuery.ajax({
                        url: "//cart-gift.jd.com/cart/app/getCartPacking.action",
                        type: "POST",
                        dataType: 'jsonp',
                        success: function (data) {
                            if(data && data.success && data.result && data.result.packing) {
                                var giftcartHtml = [];
                                giftcartHtml.push('<div class="giftcardbox-dialog hide">');
                                giftcartHtml.push('    <div class="gcb-title"><i class="jd-giftcard-icon"></i><span>礼品包装</span></div>');
                                giftcartHtml.push('    <span class="gcb-price ac">'+data.result.packing.title+'<em>￥'+data.result.packing.price+'</em></span>');
                                giftcartHtml.push('    <span class="gcb-cont ac">'+data.result.packing.content+'</span>');
                                giftcartHtml.push('    <div class="ac mt5">');
                                giftcartHtml.push('        <img width="220" height="140" src="//img30.360buyimg.com/'+data.result.packing.pic+'" alt="">');
                                giftcartHtml.push('    </div>');
// giftcartHtml.push(' <span class="gcb-cardtips">附赠精美贺卡</span>');
                                giftcartHtml.push('    <div class="gcb-ops ac mt10">');
                                if(selectgiftcart) {
                                    giftcartHtml.push('        <a href="#none" class="btn-2 delete-giftcartbox" id="'+selectgiftcart+'">删除礼品服务</a>');
                                } else {
                                    giftcartHtml.push('        <a href="#none" class="btn-1 select-giftcartbox" pid="'+pid+'" sid="'+data.result.packing.serviceSku+'">加入购物车</a>');
                                }
                                giftcartHtml.push('        <a href="#none" class="btn-9 ml10 cancel-giftcartbox">取消</a>');
                                giftcartHtml.push('    </div>');
                                giftcartHtml.push('</div>');
                                pextendobj.append(giftcartHtml.join(''));
                                giftcardDialog = $('.giftcardbox-dialog', pextendobj);

                                giftcardDialog.css('top', ($('.jd-giftcard-icon', pextendobj).closest('.promise').position().top + 22) + 'px');
                                giftcardDialog.css('left', ($('.jd-giftcard-icon', pextendobj).closest('.promise').position().left - 5) + 'px');

                                giftcardDialog.removeClass('hide');
                                if(me.isLowIE()){
                                    productitem.parent().css('z-index', 2);
                                    productitem.css('z-index', 20);
                                }
                            }
                            
                        },
                        error : function(){
                            me.showAlertDlg('获取礼品服务发生异常！');
                        }
                    });
                } else {
                var pid = $(this).closest('.promise').attr('_giftcard').split('_')[1];
                var html = '<div class="tip-box icon-box giftcard-box">'
                        + '<span class="qm-icon m-icon"></span>'
                        + '<div class="item-fore">'
                        + '<h3 class="ftx-04">该商品支持购买礼品包装和贺卡服务，继续？</h3>'
                        + '<div class="mt5">可选择精美包装、填写贺卡内容、上传温馨视频，作为礼品赠送家人、朋友、恋人、合作伙伴。（港澳台、偏远地区除外）</div>'
                        + '<div class="ftx-03 mt10">选择包装 > 填写贺卡内容 > 上传温馨视频 > OK，下单支付! > TA收到惊喜</div>'
                        + '</div>'
                        + '<div class="op-btns ac"><a href="javascript:void(0);" clstag="clickcart|keycount|xincart|cart_lipinset" class="btn-1 select-giftcard" _pid="' + pid + '">去购买</a><a href="#none" class="btn-9 ml10 del cancel-giftcard">放弃</a></div>'
                        + '</div>';
    
                var dlg = $('body').dialog({
                        title: '购买礼品包装',
                    width: 450,
                    height: 150,
                    type: 'html',
                    source:html
                });
                }
            });
            $('body').delegate('a.select-giftcard', 'click', function(){
                window.open('//cart-gift.jd.com/cart/addGiftToCart.action?pid=' + $(this).attr('_pid') + '&pcount=1&ptype=1', '_blank');
                $.closeDialog();
            });

            $('body').delegate('a.cancel-giftcard', 'click', function(){
                $.closeDialog();
            });
            $('.cart-warp').delegate('div.gcb-title', 'click', function(event){
                $('.giftcardbox-dialog', $(this).parents('.p-extend')).slideUp(200);
            });
            $('.cart-warp').delegate('a.select-giftcartbox', 'click', function(event){
            	var productDom = $("#" + $(this).attr("pid"));
            	var skuUuid = productDom.attr("skuuuid");
            	var handtailor = productDom.attr("handtailor");
                var params = "pid="+$(this).attr("sid")+"&targetId=" + $(this).attr("pid")
                			 + "&skuUuid=" + skuUuid + ((handtailor == "true") ? "&useUuid=true" : "");
                var pnode = $(this);
                me.updateCartInfo(me.iurl + '/addGiftServiceSkuToCart.action',
                    params,
                    '',
                    function(result){
                        if(me.isLowIE()){
                            pnode.closest('.item-item').parent().css('z-index', 'auto');
                            pnode.closest('.item-item').css('z-index', 'auto');
                        }
                    }
                );
            });
            var deletegiftcartbox = function(obj, callback){
            	var gInfo = $(obj).attr("id").split("_");
            	var productDom = $("#" + gInfo[0]);
           		var skuUuid = productDom.attr("skuuuid");
           		var handtailor = productDom.attr("handtailor");
                var params = "targetId="+gInfo[0]
                			 + "&skuUuid=" + skuUuid + ((handtailor == "true") ? "&useUuid=true" : "");
                var giftSkuIdMap = me.getGiftServiceIdsMap();
                me.updateCartInfo(me.iurl + '/clearGiftServiceSkuToCart.action',
                    params,
                    '',
                    function(result){
                        if(callback) {
                            callback(obj);
                        }
                        me.removeGiftCartBox(gInfo[0], giftSkuIdMap);
                        if(me.isLowIE()){
                            $(obj).closest('.item-item').parent().css('z-index', 'auto');
                            $(obj).closest('.item-item').css('z-index', 'auto');
                        }
                    }
                );
            };
            var hideGiftcardDialog = function(obj){
                var giftcardDialog = $('.giftcardbox-dialog', $(obj).parents('.p-extend'));
                if(giftcardDialog && giftcardDialog.length>0) {
                    // giftcardDialog.addClass('hide');
                    giftcardDialog.slideUp(200);
                }
            };
            var openGiftboxEditDialog = function(skuId) {
                $('body').dialog({
                    title: '写贺卡',
                    width: 480,
                    height: 260,
                    type: 'iframe',
                    fixed: !0,
                    source: decodeURIComponent('//cart-gift.jd.com/cart/tocard/cardview.action?sku='+skuId),
                    autoIframe : true
                });
            };
            $('.cart-warp').delegate('a.delete-giftcartbox', 'click', function(event){
                deletegiftcartbox(this, hideGiftcardDialog);
            });
            $('.cart-warp').delegate('a.cancel-giftcartbox', 'click', function(event){
                hideGiftcardDialog(this);
            });
            $('.cart-warp').delegate('.giftbox-ops a', 'click', function(){
                deletegiftcartbox(this);
            });
            $('.cart-warp').delegate('.giftbox-ops-global a', 'click', function(){
                deletegiftcartbox(this);
            });
            $('.cart-warp').delegate('.giftbox-edit', 'click', function () {
                var skuId = $(this).attr("skuid");
                if ($("#isLogin").val() == 0) {
	                var cartLoginUrl = PurchaseAppConfig.Domain + "/cart?rd="+Math.random();
	                me.doLogin({
	                    modal: true,
	                    returnUrl: cartLoginUrl,
	                    'clstag1': "login|keycount|5|5",
	                    'clstag2': "login|keycount|5|6",
	                    complete: function() {
                            me.setLogin();
                            window.location.href = cartLoginUrl;
	                        // openGiftboxEditDialog(skuId);
	                    }
	                });
	            } else {
                    openGiftboxEditDialog(skuId);
	            }
            });
        },
        
        getGiftServiceIdsMap : function() {
            var giftSkuIdMap = {};
            $('.giftbox-item .giftbox-ops>a').each(function (i, o) {
              var tep = $(o).attr("id").split("_");
              giftSkuIdMap[tep[0]] = tep[1];
            });
            return giftSkuIdMap;
        },
        
        removeGiftCartBox : function(ids, giftSkuIdMap, callback) {
            if(ids && ids.length>0) {
                var splitStr = ',';
                var removeGiftIds = ids.split(splitStr);
                var deleteGiftIdArr = [];
                for (var i in removeGiftIds) {
                    if (giftSkuIdMap != null && giftSkuIdMap[removeGiftIds[i]]) {
                        deleteGiftIdArr.push(removeGiftIds[i]);
                    }
                }
                if (deleteGiftIdArr.length > 0) {
                    jQuery.ajax({
                        url: "//cart-gift.jd.com/cart/app/delCartCard.action",
                        data: {
                            sku : deleteGiftIdArr.join(splitStr)
                        },
                        dataType: 'jsonp',
                        success: function (data) {
                            if(data && data.success) {
                                if(callback) {
                                    callback(data);
                                }
                            }
                        }
                    });
                }
            }
        },

        // 局部刷新的回调函数，处理店铺选中状态
        toggleVenderCheckbox: function(cb, el) {
            this.clearDialog();
            var shopEl = null;
            var shopList = null;
            // 遍历店铺子节点：
            var shopEls = $('input[name=checkShop]', $('#cart-list'));
            for (var i = 0, l = shopEls.length; i < l; i++) {
                var els = $('input[name=checkItem]', $(shopEls[i]).parents('.shop').next());
                for (var j = 0, k = els.length; j < k; j++) {
                    if ($(els[j]).attr('value') == el.attr('value')) {
                        shopList = $(shopEls[i]).parents('.shop').next();
                        shopEl = shopEls[i];
                        break;
                    }
                }
                if (shopEl) {
                    break;
                }
            }
            if (shopEl && shopList) {
                var allSel = true;
                var allDis = true;
                var cels = $('input[name=checkItem]', shopList);
                for (var i = 0, l = cels.length; i < l; i++) {
                    if (!$(cels[i]).prop('disabled')) {
                        allDis = false;
                        if (!$(cels[i]).prop('checked')) {
                            allSel = false;
                            break;
                        }
                    }
                }
                if (allDis) {
                    $(shopEl).attr("disabled", "disabled");
                    $(shopEl).removeAttr("checked");
                } else {
                    $(shopEl).prop('checked', allSel);
                    $(shopEl).removeAttr("disabled");
                }
            }
        },
        
        // 全选按钮状态更新
        toggleAll: function(){
        	var allShopSel = true;
        	var allShopDis = true;
    		$(".cart-warp :checkbox[name='checkShop']").each(function() {
        		if(!$(this).attr("disabled")){// 店铺是可选的 在去判断选中状态
        			allShopDis = false;
        			if (!$(this).prop("checked")) {
            			allShopSel = false;
    	        	}
        		}
        	});
           
    		$(".cart-warp :checkbox[name=toggle-checkboxes]").each(function(){
    			$(this).removeAttr("disabled");
    			$(this).removeAttr("checked");
            	if(allShopDis){
            		$(this).attr("disabled", "disabled");
            	}else{
            		if (allShopSel) {
                		$(this).attr("checked", "checked");
                	}
            	}
            });
        },

        // 绑定选中按钮的对应事件
        bindCheckEvent: function(){
            this.toggleSelect();
            this.toggleShopSelect();
            this.toggleSingleSelect();
        },
        
        // 全选
        toggleSelect: function(){
            var me = this;
            $('.cart-warp').delegate('input[name=toggle-checkboxes]', 'click', function(){
                // 点击复选框后所有复选框不可选
                $('input[name=toggle-checkboxes]').attr("disabled",true);

                var selected = $(this).prop("checked");

                var act = selected ? 'selectAllItem' : 'cancelAllItem';
                var tip = selected ? '全部勾选商品失败' : '全部取消商品失败';
                me.updateCartInfo(me.iurl + "/" + act + ".action" , '' , tip);
            });
        },

        // 选店铺
        toggleShopSelect: function(){
            var me = this;
            $('.cart-warp').delegate('input[name=checkShop]', 'click', function(){
                // 点击复选框后所有复选框不可选
                $(this).attr("disabled",true);

                var mEl = $(this);
                var venderid = mEl.parents('.cart-tbody').attr('id');
                venderid = venderid.substring(venderid.lastIndexOf('_')+1);

                // 店铺下所有主商品
                var pids = '';
                var items = $('input[type=checkbox]', $('#vender_' + venderid));

                for(var i=0,l=items.length; i<l; i++){
                    var pid = $(items[i]).attr('p-type');
                    if(pid){
                        pids += pid + ',';
                    }
                }

                pids = pids.substring(0, pids.length-1);

                var selected = mEl.prop("checked");
                var act = selected ? 'selectVenderItem' : 'cancelVenderItem';
                var tip = selected ? '勾选店铺商品失败' : '取消店铺商品失败';

                me.updateVenderInfo(me.iurl + '/' + act + '.action', 'venderId=' + venderid + '&p_types= ' + pids + '&t=' + me.t, tip);
            });
        },

        // 单选：对店铺和全选都有影响。
        toggleSingleSelect: function(){
            var me = this;
            $('.cart-warp').delegate('input[name=checkItem]', 'click', function(){

                // 点击复选框后所有复选框不可选
                $(this).attr("disabled", true);

                var mEl = $(this);
                var productDom = $(this).closest(".item-item");
                
                var manFanZeng = mEl.attr("manFanZeng");
                var arr = mEl.val().split("_");
                var pid = arr[0];
                var ptype = arr[1];
                var targetId = 0;
                var skuUuid = productDom.attr("skuuuid");
                var handtailor = productDom.attr("handtailor");

                if(arr.length == 3){
                    targetId = arr[2];
                }

                if(me.checkSku(pid)){

                    // 是否勾选商品
                    var cb = mEl.prop("checked");
                    var act = cb ? 'selectItem' : 'cancelItem';
                    var tip = cb ? '勾选商品失败，请刷新页面重试。' : '取消商品失败，请刷新页面重试。';

                    var outSkus = me.outSkus;
                    var venderId = mEl.parents('.cart-tbody').attr('id');
                    venderId = venderId.substring(venderId.lastIndexOf('_')+1);
                	var params = "&pid=" + escape(pid)
		                        + "&ptype=" + escape(ptype)
		                        + "&skuUuid=" + escape(skuUuid)
			                    + ((handtailor == "true") ? "&useUuid=true" : "")
		                        + "&packId=0"
		                        + "&targetId=" + escape(targetId)
		                        + "&promoID=" + escape(targetId)
		                        + "&venderId=" + venderId
		                        + "&t=" + me.t
		                    	+ "&manFanZeng=1";
                	
                    if(manFanZeng == '1' || ptype == '4'){
                    	var venderId = mEl.parents('.cart-tbody').attr('id');
                        venderId = venderId.substring(venderId.lastIndexOf('_')+1);
                    	var params = "&pid=" + escape(pid)
			                        + "&ptype=" + escape(ptype)
			                        + "&skuUuid=" + escape(skuUuid)
			                        + ((handtailor == "true") ? "&useUuid=true" : "")
			                        + "&packId=0"
			                        + "&targetId=" + escape(targetId)
			                        + "&promoID=" + escape(targetId)
			                        + "&venderId=" + venderId
			                        + "&t=" + me.t
			                    	+ "&manFanZeng=1";
                    	
                        me.updateVenderInfo(me.iurl + "/" + act + ".action", params, tip);
                    }else{
                    	var venderId = mEl.parents('.cart-tbody').attr('id');
                        venderId = venderId.substring(venderId.lastIndexOf('_')+1);
                    	var params = "&outSkus=" + outSkus
			                        + "&pid=" + escape(pid)
			                        + "&ptype=" + escape(ptype)
			                        + "&skuUuid=" + escape(skuUuid)
			                        + ((handtailor == "true") ? "&useUuid=true" : "")
			                        + "&packId=0"
			                        + "&targetId=" + escape(targetId)
			                        + "&promoID=" + escape(targetId)
			                        + "&venderId=" + venderId
			                        + "&t=" + me.t;
			            me.updateProductInfo(me.iurl + "/" + act + ".action?rd" + Math.random(),
			                params,
			                tip,
			                function(result){
			                    me.toggleVenderCheckbox(cb, mEl);
			                }
			            );
                    }
                }else{
                    me.showAlertDlg('对不起，您选择的商品不存在！');
                }
            });
        },

        initJdServices: function(){
            // 选择京东服务
            var me = this;
            $('.cart-warp').delegate('.promise .jd-service', 'click', function(event){
                me.clearDialog();
                // 判断当前商品是否已经含有延保弹出窗体
                var jdServiceDialog = $('.jd-service-integration', $(this).parents('.p-extend'));
                if(!jdServiceDialog || jdServiceDialog && !jdServiceDialog.length){
                	var mnode = $(this).parents('.promise');
                	var pids = mnode.attr('_yanbao').split('_');
                	var sids = mnode.attr('_service').split('_');
                	var isproduct = mnode.attr('isproduct');
                	
                	var itemDom = $(this).parents('.item-item');
                	var itemsRepeat = ($("[id=product_" + itemDom.attr("skuid") + "]").length) > 1;
                	var selectybidArr = [];
                	if (itemsRepeat) {
                		var ybids = $("#selectybids_" + itemDom.attr("skuuuid")).val();
                		selectybidArr = ybids.split("_");
                	}
                	
                	var data ;
                	if(me.ybobjs[pids[1] + '_' + pids[2]]){
                		data = me.ybobjs[pids[1] + '_' + pids[2]].data;
                	}
	                var sdate ='';
	                var type = '';// 1单品，2套装 3虚拟组套
	                if(isproduct == "1"){
	                	type = 1;
	                	if(me.jdhsobjs[sids[1] + '_' + '_']){
	                		sdate = me.jdhsobjs[sids[1] + '_' + '_'].data;
	                	}
                	}else{
                		if(sids[2]){
                			type = 3;
                			if(me.jdhsobjs[sids[1] + '_' + sids[2] + '_']){
                				sdate = me.jdhsobjs[sids[1] + '_' + sids[2] + '_'].data;
                			}
                		}else{
                			type = 2;
                			if(me.jdhsobjs[sids[1] + '_' + '_' + pids[2]]){
                				sdate = me.jdhsobjs[sids[1] + '_' + '_' + pids[2]].data;
                			}
                		}
                	}
	                var selectedArr = [];
	                var selectedServiceArr = [];
	                var ybhtml = '<div id="jd-service-inte" class="jd-service-integration" style="display: block; top: 310px; left: 126px;">';
	                	ybhtml += '<div class="jd-service-tit"><i class="jd-service-icon"></i><span>选服务</span></div>';
	                	ybhtml += '<div class="jd-service-cont yb-item-list">';
	                var yanbaoGroupsHtml = '';
	                if(data){
	                	for(var i=0,yanbaoGroups=data.platformGroups,groupslen=yanbaoGroups.length; i<groupslen; i++){
	                		var nowGroup = yanbaoGroups[i];
	                		yanbaoGroupsHtml += '<div class="jd-service-itemlist"><ul><li><span class="jd-service-item-tit"><img src=//img30.360buyimg.com/'+nowGroup.imgUrl+' class="jd-service-item-tit-img">'+nowGroup.brandName+'</span></li>'
	                		var groupItems = nowGroup.platformConfigVOs;
	                		// 拼接每个group下的服务项目
	                		for(var j=0,itemslen=groupItems.length; j<itemslen; j++){
	                			var isSelect = false;
	                			if (itemsRepeat) {
	                        		for (var ind in selectybidArr) {
	                        			if (selectybidArr[ind] == groupItems[j].platformId) {
	                        				isSelect = true;
	                        			}
	                        		}
	                        	} else if(groupItems[j].selected) {
	                        		isSelect = true;
	                        	}
	                        	if(isSelect){
	                				selectedArr.push(groupItems[j].platformId);
	                				yanbaoGroupsHtml += '<li><div class="yb-item item-selected" ';
	                			} else{
	                				yanbaoGroupsHtml += '<li><div class="yb-item" ';
	                			}
	                			yanbaoGroupsHtml += '_id="' + groupItems[j].skuId + '_' + groupItems[j].platformId + '_' + groupItems[j].rSuitId + '"title="'+groupItems[j].tip+'">'
	                			+ groupItems[j].platformName + '<br>¥' + groupItems[j].price + '<br><a href="//item.jd.com/' + groupItems[j].platformId + '.html" target="_blank">详情&nbsp;></a>' + '<b></b>';
	                			// 是否显示优惠服务图标
	                			if(groupItems[j].favor){
	                				yanbaoGroupsHtml += '<s class="yb-icon-hui"></s>';
	                			}
	                			yanbaoGroupsHtml += "</div></li>";
	                		}
	                		yanbaoGroupsHtml += "</ul></div>";
	                	}
	                }
	                if(sdate){
	                	for(var i=0,sGroups=sdate.jdHomeServiceGroups,groupslen=sGroups.length; i<groupslen; i++){
	                		var nowGroup = sGroups[i];
	                		yanbaoGroupsHtml += '<div class="jd-service-itemlist"><ul><li><span class="jd-service-item-tit"><img src='+nowGroup.scIconUrl+' class="jd-service-item-tit-img">'+nowGroup.scName+'</span></li>'
	                		var groupItems = nowGroup.jdHomeServiceInfos;
	                		
	                		// 拼接每个group下的服务项目
	                		for(var j=0,itemslen=groupItems.length; j<itemslen; j++){
	                			if(groupItems[j].selected){
	                				selectedServiceArr.push(groupItems[j].serviceSkuId);
	                				yanbaoGroupsHtml += '<li><div class="yb-item item-selected" ';
	                			} else{
	                				yanbaoGroupsHtml += '<li><div class="yb-item" ';
	                			}
	                			yanbaoGroupsHtml += '_jid="' + groupItems[j].serviceSkuId + '"title="'+groupItems[j].serviceSkuAdWord+'">'
	                			+ groupItems[j].serviceSkuShortName +'<br>¥' + groupItems[j].serviceSkuPrice + '<br><a href="//item.jd.com/' + groupItems[j].serviceSkuId + '.html" target="_blank">详情&nbsp;></a>' + '<b></b>';
	                			// 是否显示优惠服务图标
	                			if(groupItems[j].favor){
	                				yanbaoGroupsHtml += '<s class="yb-icon-hui"></s>';
	                			}
	                			yanbaoGroupsHtml += "</div></li>"; 	
	                		}
	                		yanbaoGroupsHtml += "</ul></div>";
	                	}
	                }
	                ybhtml += yanbaoGroupsHtml + '</div><div class="jd-service-btns ac"><a href="#none" class="btn-1 select-service">确定</a><a href="#none" class="btn-9 ml10 del cancel-service">取消</a></div></div>';
	                mnode.after(ybhtml);
	              
	                // 改变框高度
	                $('.jd-service-cont .gap', $(this).closest('.p-extend')).height($('.jd-service-cont', $(this).closest('.p-extend')).height());
	                // 设置显示延保窗体的位置
                    var newjdServiceDialog = $('.jd-service-integration', $(this).parents('.p-extend'));
                    newjdServiceDialog.css('top', ($('.jd-service-icon').closest('.promise').position().top + 22) + 'px');
                    newjdServiceDialog.css('left', ($('.jd-service-icon').closest('.promise').position().left - 4) + 'px');

	                if(me.ybobjs[pids[1] + '_' + pids[2]]){
	                	me.ybobjs[pids[1] + '_' + pids[2]].selectedData = selectedArr;
	                }
	                if(type == 1){
	                	if(me.jdhsobjs[sids[1]+'_'+'_']){
        	               me.jdhsobjs[sids[1]+'_'+'_'].selectedData = selectedServiceArr;
	                	}
	                }else if(type == 2){
	                	if(me.jdhsobjs[sids[1] + '_' + '_' + pids[2]]){
	                		me.jdhsobjs[sids[1] + '_' + '_' + pids[2]].selectedData = selectedServiceArr;
	                	}
	                }else if(type == 3){
	                	if(me.jdhsobjs[sids[1] + '_' + sids[2] + '_']){
	                		me.jdhsobjs[sids[1] + '_' + sids[2] + '_'].selectedData = selectedServiceArr;
	                	}
	                }
                } else {
                	jdServiceDialog.slideDown(200);
                }
                if(me.isLowIE()){
                	$('.yb-icon-hui').css('top', 0);
                	$(this).closest('.item-item').parent().css('z-index', 2);
                    $(this).closest('.item-item').css('z-index', 20);
                }
                me.doLog('newcart', 'clickcart', 'fuwuclick');
                event.stopPropagation();
            });
            
            $('.cart-warp').delegate('.jd-service-tit', 'click', function(event){
            	$('.jd-service-integration', $(this).parents('.p-extend')).slideUp(200);
            });
            
            // 延保项目勾选样式控制
            $('.cart-warp').delegate('.yb-item-list .yb-item', 'click', function(event){
            	// 点击详情跳转标签不更改样式
            	if (event.target.localName === "a" && event.target.textContent.replace(/\s/g, "") === "详情>") {
            		return;
            	}
            	var $me = $(this);
                if($me.hasClass('item-selected')){
                    $me.removeClass('item-selected');
                } else {
                    $me.parent().siblings().children('.yb-item').removeClass('item-selected');
                    $me.addClass('item-selected');
                }
            });

            $('.cart-warp').delegate('.cancel-service', 'click', function(event){
            	$('.jd-service-integration', $(this).parents('.p-extend')).hide();
            });

            $('.cart-warp').delegate('.select-service', 'click', function(event){
                var pnode = $(this).closest('.jd-service-integration');
                // _yanbao属性值，0为'yanbao'，1为商品id，2为套装id
                var pids = pnode.prev().attr('_yanbao').split('_');
                // _service属性值,1为skuid，2为虚拟组套id
                var sids = pnode.prev().attr('_service').split('_');
                // 根据点击确定后的class情况，查找出选中的延保ids
                var yanbaoItems = $('.yb-item', pnode);
                var platformIds = '';
                var serviceIds = '';
                var isproduct = pnode.prev().attr('isproduct');
                var sdate;
                // 1单品 2套装3虚拟组套
                var productState='';
                if(isproduct == "1"){
                	productState = '1';
                	if(me.jdhsobjs[sids[1]+'_'+'_']){
                		sdate = me.jdhsobjs[sids[1]+'_'+'_'].selectedData;
                	}
            	}else{
            		if(sids[2]){
            			productState = '3';
            			if(me.jdhsobjs[sids[1] + '_' + sids[2] + '_']){
            				sdate = me.jdhsobjs[sids[1] + '_' + sids[2] + '_'].selectedData;
            			}
            		}else{
            			productState = '2';
            			if(me.jdhsobjs[sids[1] + '_' + '_' + pids[2]]){
            				sdate = me.jdhsobjs[sids[1] + '_' + '_' + pids[2]].selectedData;
            			}
            		}
            	}
                for(var i=0,len=yanbaoItems.length; i<len; i++){
                    var yanbaoItem = yanbaoItems[i];
                    if($(yanbaoItem).hasClass('item-selected')){
                    	var id = $(yanbaoItem).attr('_id');
                    	var sid = $(yanbaoItem).attr('_jid');
                    	if(id){
                    		platformIds += $(yanbaoItem).attr('_id').split('_')[1] + ',';
                    	}
                    	if(sid){
                    		serviceIds += $(yanbaoItem).attr('_jid') + ',';
                    	}
                    }
                }
                platformIds = platformIds.substring(0, platformIds.length-1);
                serviceIds = serviceIds.substring(0, serviceIds.length-1);
                // 若选择的延保id和目前（点确定时）选择的延保id相同，即无变动，则直接返回。
                var ybFlag;
                if(me.ybobjs[pids[1] + '_' + pids[2]]){
                	ybFlag = me.ybobjs[pids[1] + '_' + pids[2]].selectedData == platformIds;
                }
                var jsFlag = sdate == serviceIds;
                if(ybFlag && jsFlag){
                    pnode.hide();
                    if(me.isLowIE()){
                        pnode.closest('.item-item').parent().css('z-index', 'auto');
                        pnode.closest('.item-item').css('z-index', 'auto');
                    }
                    return;
                }

                // 准备参数。ptype类型 表示单品和赠品的
                var skuId = pids[1];
                var suitId = pids[2];
                var ptype = suitId ? SkuItemType.YbOfPacks : SkuItemType.YbOfSkusOrGifts;
                var ybNums = 1;
                var productDom = $(this).closest('.item-item');
                var skuUuid = productDom.attr("skuuuid");
                var handtailor = productDom.attr("handtailor");
                var params = '';
                var act = '/handleService.action';
                var yb = '';
                var service = '';
                if(ybFlag && !jsFlag){
                	service = me.getService(serviceIds,skuId,suitId,productState,sids[2]);
                }else if(!ybFlag && jsFlag){
                	yb = me.getYb(platformIds,suitId,platformIds,ptype,skuId,ybNums);
                }else if(!ybFlag && !jsFlag){
                	yb = me.getYb(platformIds,suitId,platformIds,ptype,skuId,ybNums);
                	service = me.getService(serviceIds,skuId,suitId,productState,sids[2]);
                }
                params = yb+"&"+service + "&skuUuid=" + skuUuid + ((handtailor == "true") ? "&useUuid=true" : "");
                me.updateCartInfo(me.iurl + act,
                    params,
                    '',
                    function(result){
                        pnode.hide();
                        if(me.isLowIE()){
                            pnode.closest('.item-item').parent().css('z-index', 'auto');
                            pnode.closest('.item-item').css('z-index', 'auto');
                        }
                        if(me.ybobjs[pids[1] + '_' + pids[2]]){
                        	me.ybobjs[pids[1] + '_' + pids[2]].selectedData = platformIds;
                        }
                    }
                );
            });

            $('.cart-warp').delegate('.service-ops a.J_yb_del,.service-ops-global a.J_yb_del', 'click', function(){
                var pids = $(this).closest('.jdservice-items').attr('ids').split('_');
                var skuId = pids[0];
                var suitId = pids[1];
                var ptype = suitId ? SkuItemType.YbOfPacks : SkuItemType.YbOfSkusOrGifts;
                var yanbaoIds = '';
                var params = '';
                var act = '';
                var productDom = $(this).closest('.item-item');
                var skuUuid = productDom.attr("skuuuid");
                var handtailor = productDom.attr("handtailor");
                $(this).closest('.service-item').siblings().each(function(){
					var ybId = $(this).find('a','.service-ops').attr('ybid');
                	if (ybId) {
                		yanbaoIds += ybId + ',';
                	}
                });
                if(yanbaoIds){
                    params = 'packId=' + suitId
                        + '&pid=' + yanbaoIds
                        + '&ptype=' + ptype
                        + '&targetId=' + skuId
                        + "&skuUuid=" + skuUuid
                        + ((handtailor == "true") ? "&useUuid=true" : "")
                        + '&ybNums=1';
                    act = "/addYbSkusToCart.action";
                } else{
                    params = 'packId=' + suitId
                        + '&ptype=' + ptype
                        + '&targetId=' + skuId
                        + "&skuUuid=" + skuUuid
                        + ((handtailor == "true") ? "&useUuid=true" : "")
                        +'&pid=' + skuId;
                    act = "/clearSkuYbsToCart.action";
                }
                me.updateCartInfo(me.iurl + act, params, '删除延保失败', null);
            });
            
            $('.cart-warp').delegate('.service-ops a.J_jdhs_del,.service-ops-global a.J_jdhs_del', 'click', function(){
                var pids = $(this).closest('.jdservice-items').attr('ids').split('_');
                var packId = $(this).closest('.jdservice-items').attr('_packId');
                var skuId = pids[0];
                var vskuId= $(this).parents('.service-item').attr('vskuId');
                var sIds = $(this).attr('jhsid');
                var productDom = $(this).closest('.item-item');
                var skuUuid = productDom.attr("skuuuid");
                var handtailor = productDom.attr("handtailor");
                var act = '/removeService.action';
                var params = 'serviceParam.targetId=' + skuId
              	+ '&serviceParam.itemId=' + sIds + '&skuUuid=' + skuUuid
                + ((handtailor == 'true') ? '&useUuid=true' : '')
              	if(vskuId){
              		params += '&serviceParam.packId=' + vskuId
              		+ '&serviceParam.suitType=1'
              	}else if(packId){
              		params += '&serviceParam.packId=' + packId
              	}
                me.updateCartInfo(me.iurl + act, params, '删除服务失败', null);
            });
            
       	   $('.cart-warp').delegate('.service-ops a.J_fs_del,.service-ops-global a.J_fs_del', 'click', function(){
                       var targetId = $(this).closest('.jdservice-items').attr('_targetId');
                       var packId = $(this).closest('.jdservice-items').attr('_packId');
                       var pid =  $(this).closest('.jdservice-items').attr('_skuId');
                       var fsId = $(this).attr('fsid');
                       var productDom = $(this).closest('.item-item');
                       var skuUuid = productDom.attr("skuuuid");
                       var handtailor = productDom.attr("handtailor");
                       var act = '';
                       var params = 'packId=' + packId
       			                 + '&pid=' + pid
       			                 + '&targetId=' + targetId
       			                 + "&skuUuid=" + skuUuid
       			                 + ((handtailor == "true") ? "&useUuid=true" : "")
       			                 + '&ptype=4' 
       			                 + '&fsIds=' + fsId;
                       act = "/removeFsService.action";
                       me.updateCartInfo(me.iurl + act, params, '删除服务失败', null);
           });
            
          },
          
          getYb:function(platformIds,suitId,platformIds,ptype,skuId,ybNums){
        	  var me = this;
        	  var yb = '';
        	  if(platformIds){
                  // 添加延保
              	yb = 'ybParam.action=add&ybParam.packId=' + suitId
                      + '&ybParam.pid=' + platformIds
                      + '&ybParam.ptype=' + ptype
                      + '&ybParam.targetId=' + skuId
                      + '&ybParam.ybNums=' + ybNums;
                  me.doLog('newcart', 'clickcart', 'cart_fuwujia');
              } else{
              	yb = 'ybParam.action=clear&ybParam.packId=' + suitId
                      + '&ybParam.ptype=' + ptype
                      + '&ybParam.targetId=' + skuId ;
                  me.doLog('newcart', 'clickcart', 'cart_fuwujian');
              }
        	  return yb;
          },

          getService:function(serviceIds,skuId,suitId,productState,packId){
        	  var service = '';
        	  if(serviceIds){
              	// 添加服务
              	service = 'serviceParam.action=add&serviceParam.targetId=' + skuId
              	+ '&serviceParam.itemId=' + serviceIds
              	if(productState == 2){
              		service += '&serviceParam.packId=' + suitId;
              	}else if(productState == 3){
              		service += '&serviceParam.packId=' + packId
              		+ '&serviceParam.suitType=1';
              	}
              }else{
              	// 清空服务
              	service = 'serviceParam.action=clear&serviceParam.targetId=' + skuId
              	if(productState == 2){
              		service += '&serviceParam.packId=' + suitId;
              	}else if(productState == 3){
              		service += '&serviceParam.packId=' + packId
              		+ '&serviceParam.suitType=1';
              	}
              }
        	  return service;
          },
          
        
        // 促销优惠
        initPromotionEvent: function(){
            var me = this;
            $('.cart-warp').delegate('a.sales-promotion', 'click', function(event){
                me.clearDialog();

                // 受父节点的position 影响。tongen
                var offset = $(this).position();
                $(this).next().css('left', (offset.left) + 'px');
                $(this).next().css('top', (offset.top + 20) + 'px');
                $(this).next().slideDown(200);

                if(me.isLowIE()){
                    $(this).closest('.item-item').parent().css('z-index', 10);
                    $(this).closest('.item-item').css('z-index', 20);
                }

                me.doLog('newcart', 'clickcart','youhuiclick');

                event.stopPropagation();
                return false;
            });

            // 促销浮层内部操作：确定
            $('.cart-warp').delegate('.select-promotion', 'click', function(event){

                var el = $(this);
                var pnode = el.closest('.promotion-tips');
                var data = $('input:radio:checked', pnode).val();
                var multiPromotion = $('input:radio:checked', pnode).attr('multiPromotion');// 是否是跨店铺促销
                var productDom = el.closest('.item-item');
                var datas = data.split("_");
                var venderid = datas[0];
                var modifyid = datas[1];
                var pid = datas[2];
                var ptype = datas[3];
                var curPromoId = datas[4];
                if(!curPromoId){
                    curPromoId = 0;
                }
                var skuUuid = productDom.attr("skuuuid");
                var handtailor = productDom.attr("handtailor");
                var targetId = curPromoId;
                // 不使用优惠的时候~~
                if(targetId == modifyid || curPromoId==0 && modifyid<0) {
                    pnode.hide();
                    if(me.isLowIE()){
                    	productDom.parent().css('z-index', 'auto');
                    	productDom.css('z-index', 'auto');
                    }
                    event.stopPropagation();
                    return false;
                }

                var params = "venderId=" +venderid
                            + "&pid=" + pid
                            + "&ptype=" + ptype
                            + "&promoID=" + curPromoId
                            + "&skuUuid=" + skuUuid
		                    + ((handtailor == "true") ? "&useUuid=true" : "")
                            + "&targetId=" + targetId
                            + (modifyid ? ("&modifyPromoID=" + modifyid) : '');

                if(venderid*1<0 || multiPromotion==1 || multiPromotion==7 || multiPromotion==8
                        || multiPromotion==20 || multiPromotion==21 || multiPromotion==22){// 如果店铺是虚拟店铺或者所选促销是跨店铺促销
                	params = params + "&multiPromotion=1" ;
                	me.updateCartInfo(me.iurl + '/changePromotion.action' ,params ,'' ,null);
                }else{
                    params = params + "&t="+me.t;
                	me.updateVenderInfo(me.iurl + '/changePromotion.action',
                            			params,
                            			'', 
                            			function(){
                                			pnode.hide();
                                			if(me.isLowIE()){
                                				pnode.closest('.item-item').parent().css('z-index', 'auto');
                                				pnode.closest('.item-item').css('z-index', 'auto');
                                			}
                            			}
                	);
                }

                me.doLog('newcart', 'clickcart','youhuiokclick');

                // event.stopPropagation();
                // return false;
            });

            // 促销浮层内部操作：取消
            $('.cart-warp').delegate('.cancel-promotion', 'click', function(event){
                $(this).closest('.promotion-tips').slideUp(200);
                if(me.isLowIE()){
                    $(this).closest('.item-item').parent().css('z-index', 'auto');
                    $(this).closest('.item-item').css('z-index', 'auto');
                }

                // event.stopPropagation();
                // return false;
            });
        },
		
		// plus价格切换
        initPlusPriceSwitchEvent: function() {
        	var me = this;
            $('.cart-warp').delegate('p.plus-switch', 'click', function(event){
                me.clearDialog();
                // 受父节点的position 影响。tongen
                var offset = $(this).position();
                $(this).next().css('left', ($(this).find('strong')[0].offsetLeft - 10) + 'px');
                $(this).next().css('top', (offset.top + 19) + 'px');
                $(this).next().slideDown(200);

                if(me.isLowIE()){
                    $(this).closest('.item-item').parent().css('z-index', 10);
                    $(this).closest('.item-item').css('z-index', 20);
                }

                me.doLog('newcart', 'clickcart','priceswitchclick');
                event.stopPropagation();
                return false;
            });
            
            // 选价格浮层内部操作：确定
            $('.cart-warp').delegate('.select-priceswitch', 'click', function(event){

                var el = $(this);
                var pnode = el.closest('.price-switch-tips');
                var data = $('input:radio:checked', pnode).val();
                var multiPromotion = $('input:radio:checked', pnode).attr('multiPromotion');// 是否是跨店铺
                var targetPrice = $('input:radio:checked', pnode).attr('targetPrice');
                var datas = data.split("_");
                var venderid = datas[0];
                var modifyProductPromotionID = datas[1];
                var pid = datas[2];
                var ptype = datas[3];
                var discountedPrice = datas[4];
                var targetId = datas[5];
                if(!targetId){
                    targetId = 0;
                }
//                var targetId = curPromoId;
                // 不使用优惠的时候~~
                if(discountedPrice == targetPrice) {
                    pnode.hide();
                    if(me.isLowIE()){
                        pnode.closest('.item-item').parent().css('z-index', 'auto');
                        pnode.closest('.item-item').css('z-index', 'auto');
                    }
                    event.stopPropagation();
                    return false;
                }

                var params = "venderId=" +venderid
                            + "&pid=" + pid
                            + "&ptype=" + ptype
//                            + "&promoID=" + curPromoId
                            + "&targetId=" + targetId
                            + "&modifyProductPromoID=" + modifyProductPromotionID
                            + "&multiPromotion=1";

                me.updateCartInfo(me.iurl + '/changePromotion.action' ,params ,'' ,null);
                me.doLog('newcart', 'clickcart','youhuiokclick');

                // event.stopPropagation();
                // return false;
            });
            
            // 选价格浮层内部操作：取消
            $('.cart-warp').delegate('.cancel-priceswitch', 'click', function(event){
                $(this).closest('.price-switch-tips').slideUp(200);
                if(me.isLowIE()){
                    $(this).closest('.item-item').parent().css('z-index', 'auto');
                    $(this).closest('.item-item').css('z-index', 'auto');
                }

                // event.stopPropagation();
                // return false;
            });
        },

        initJbeanEvent: function(){
            // 使用京豆优惠、取消京豆优惠
            var me = this;
            $('.cart-warp').delegate('.beans-info-new .bean-info-btn, .beans-info-new .bean-info-btn', 'click', function(){
                var el = $(this);
                var data = el.attr("id");
                var datas = data.split("_");

                var type = datas[0];
                var pid = datas[1];
                var ptype = datas[2];
                var curPromoId = datas[3] || 0;
                var productDom = el.closest('.item-item');
                var skuUuid = productDom.attr("skuuuid");
                var handtailor = productDom.attr("handtailor");
                var params = '';

                if(type.indexOf('cancel') != -1){
                    var params = "pid=" + pid
                                + "&ptype=" + ptype
                                + "&skuUuid=" + escape(skuUuid)
                                + ((handtailor == "true") ? "&useUuid=true" : "")
                                + "&promoID=" + curPromoId
                                + "&targetId=" + curPromoId
                                + "&modifyProductPromoID=-1" 
                                + '&t='+me.t;
                } else{
                    var modifyProductPromId = datas[4];
                    var params = "pid=" + pid
                                + "&ptype=" + ptype
                                + "&skuUuid=" + skuUuid
                                + ((handtailor == "true") ? "&useUuid=true" : "")
                                + "&promoID=" + curPromoId
                                + "&targetId=" + curPromoId
                                + '&t='+me.t;
                    if(modifyProductPromId){
                        params += "&modifyProductPromoID=" + modifyProductPromId;
                    }
                }
                var proEl = $('input[name=checkItem]', el.parents('.item-item'));
                me.updateProductInfo(me.iurl + "/changeJbeanPromotion.action?rd" + Math.random(), params, '', function(){
                    me.toggleVenderCheckbox(true, proEl);
                });
            });
        },

        // 增加交互效果
        // 数量增减的时候，确定频率，频率太高，不请求数据。只按最后一个请求数据
        // 输入数量值
        // 在最小购买数量——最大库存数量和最大商品数量，范围内任意加减;
        // 最大、最小购买量时，弹提示。
        // 最大库存小于最大购买量时，弹提示。

        // 先请求接口，再回调交互。
        bindskuNumEvent:function(){
            var me = this;

            $('.cart-warp').delegate('a.increment', 'click', function(){
                if(me.doing) return;
                var anode = $(this);
                if(anode.hasClass('disabled')){
                    return;
                }
                
                me.doing = true;

                var pnode = anode.parent();
                var inputEl = $('input', pnode);
                var cur = inputEl.val();
                cur++;
                inputEl.css('color','#fff');

                var uphtml = '<span class="upspan"><span style="position:relative;">' + (cur-1) + '</span></span>';
                var downhtml = '<span style="top:28px;" class="downspan"><span style="position:relative;">' + cur + '</span></span>';
                pnode.prepend(uphtml);
                pnode.append(downhtml);

                $(".upspan span:last").animate({top: -28}, "10");
                $(".downspan span:last").animate({top: -28}, "10",function(){
                    $('.downspan,.upspan').remove();
                    inputEl.css('color','#333');
                    inputEl.val(cur);
                    me.addSkuNum(anode);
                });
            });

            $('.cart-warp').delegate('a.decrement', 'click', function(){
                if(me.doing) return;

                var anode = $(this);
                if(anode.hasClass('disabled')){
                    return;
                }

                me.doing = true;

                var pnode = anode.parent();
                var inputEl = $('input', pnode);
                var cur = inputEl.val();
                cur--;
                if(cur == 0){
                    return;
                }

                inputEl.css('color','#fff');
                var uphtml = '<span class="upspan"><span style="position:relative;">' + (cur+1) + '</span></span>';
                var downhtml = '<span style="top:-28px;" class="downspan"><span style="position:relative;">' + cur + '</span></span>';
                pnode.prepend(uphtml);
                pnode.append(downhtml);

                $(".upspan span:last").animate({top: 28}, "10");
                $(".downspan span:last").animate({top: 28}, "10",function(){
                    $('.downspan,.upspan').remove();
                    inputEl.css('color','#333');
                    inputEl.val(cur);
                    me.minusSkuNum(anode);
                });
            });

            // 商品数量文本框获取焦点，保存之前的值
            $('.cart-warp').delegate('div.quantity-form input', 'focus', function(event){
                var val = parseInt($(this).val());
                if(isNaN(val)){
                    return;
                }

                if(val){
                    $("#changeBeforeValue").val(val);
                    $("#changeBeforeId").val($(this).attr("id"));
                }
            });

            // 改变商品数量
            $('.cart-warp').delegate('div.quantity-form input', 'change', function(event){
                me.inputSkuNum(this);
            });
        },

        // 增加商品数量+
        addSkuNum: function(obj){
            var ss =$(obj).attr("id").split("_");
            var venderid = ss[1];
            var pid = ss[2];
            var pcount = ss[3];
            var ptype = ss[4];
            var targetId = 0;
            if(ss.length==7){
                targetId = ss[6];
            }
            var productDom = $(obj).closest('.item-item');
            var skuUuid = productDom.attr("skuuuid");
            var handtailor = productDom.attr("handtailor");
            var promoID = $(obj).parent().attr("promoid") || 0;
            var num = parseInt(pcount) + 1;

            ss[3] = num;
            var aimnode = ss.join('_');
            if(num > 0 && num < 100000){
                var params = "t=" + this.t + "&venderId=" + venderid
                    + "&pid="+pid
                    + "&pcount="+num
                    + "&ptype="+ptype
                    + "&skuUuid=" + skuUuid
                    + ((handtailor == "true") ? "&useUuid=true" : "")
                    + "&targetId="+targetId
                    + "&promoID="+promoID;
                this.changeSkuNum(params, $(obj).prev(), aimnode, num);
            }else{
	            // 还原input值,弹出提示信息
            	$(obj).prev().val(pcount);
            	this.doing = false;
            	if (num <= 0){
            		this.showAlertDlg("商品数量必须大于0");
            	}else {
            		this.showAlertDlg("商品数量超限");
            	}
            }
        },

        // 减少商品数量-
        minusSkuNum: function(obj){
            var ss =$(obj).attr("id").split("_");
            var venderid = ss[1];
            var pid = ss[2];
            var pcount = ss[3];
            var ptype = ss[4];
            var targetId = 0;
            // 减的时候没有数量限制的数量 所以数据比add和input都少一位。
            if(ss.length==6){
                targetId = ss[5];
            }
            var productDom = $(obj).closest('.item-item');
            var skuUuid = productDom.attr("skuuuid");
            var handtailor = productDom.attr("handtailor");
            var promoID = $(obj).parent().attr("promoid") || 0;
            var num = parseInt(pcount) - 1;

            ss[3] = num;
            var aimnode = ss.join('_');

            if(num > 0 && num < 100000){
                var params = "t=" +  this.t 
                		+ "&venderId=" + venderid
                        + "&pid="+pid
                        + "&pcount="+num
                        + "&ptype="+ptype
                        + "&skuUuid=" + skuUuid
                        + ((handtailor == "true") ? "&useUuid=true" : "")
                        + "&targetId="+targetId
                        + "&promoID="+promoID;
                this.changeSkuNum(params, $(obj).next(), aimnode, num);
            }else{// 还原input值
                $(obj).next().val(pcount);
                this.doing = false;
            }
        },

        // 修改商品数量
        inputSkuNum: function(obj){
            var ss =$(obj).attr("id").split("_");
            var venderid = ss[1];
            var pid = ss[2];
            var pcount = ss[3];
            var ptype = ss[4];
            var targetId = 0;
            var packId = 0;
            if(ss.length==7){
                targetId = ss[6];
            }
            if(ss.length==8){
                targetId = ss[6];
                packId = ss[7];
            }
            var productDom = $(obj).closest('.item-item');
            var skuUuid = productDom.attr("skuuuid");
            var handtailor = productDom.attr("handtailor");
            var promoID = $(obj).parent().attr("promoid") || 0;
            var num = $(obj).val();

            ss[3] = num;
            var aimnode = ss.join('_');

            if(num > 0 && num < 100000 && pcount != num){
                var params = "t=" +this.t + "&venderId=" + venderid
                        + "&pid="+pid
                        + "&pcount="+num
                        + "&ptype="+ptype
                        + "&skuUuid=" + skuUuid
                        + ((handtailor == "true") ? "&useUuid=true" : "")
                        + "&targetId="+targetId
                        + "&packId="+packId
                        + "&promoID="+promoID;

                this.changeSkuNum(params, $(obj), aimnode, num);
            }else{
            	// 还原input值,弹出提示信息
            	$(obj).val(pcount);
            	this.doing = false;
            	if (num <= 0){
            		this.showAlertDlg("商品数量必须大于0");
            	}else {
            		this.showAlertDlg("商品数量超限");
            	}
            }
        },

        changeSkuNum: function(params, obj, aimnode, num){
            if ($(obj).attr("minnum") && parseInt(num) < parseInt($(obj).attr("minnum"))) {
                this.showAlertDlg("最低购买" + $(obj).attr("minnum") + "件");
            }
            var me = this;
            var mEl = $('input[type=checkbox]', obj.closest('.item-form'));
            this.updateVenderInfo(this.iurl + "/changeNum.action",
                params,
                "修改商品数量失败",
                function(){
                    me.toggleVenderCheckbox(true, mEl);
                },
                obj,
                aimnode
            );
        },

        // 检查商品id
        checkSku: function(pid){
            if(!pid || isNaN(pid)){
                return false;
            }

            if(parseInt(pid) > 0){
                return true;
            }
            return false;
        },

        initArea: function(){
            // 选定地址后，写入cookie，下次打开浏览器时显示上次保存数据。
            // cookie有数据，显示cookie；没有数据默认北京
            // 根据地址查库存。
            var originalIpLocation = $.jCookie("ipLoc-djd") || "1-72-2819";
            this.ipLocation = originalIpLocation;

            if (this.ipLocation.indexOf(".") > -1) {
                this.ipLocation = this.ipLocation.substring(0, this.ipLocation.indexOf("."));
            }

            var me = this;
            var isHasOversea = me.overseaAreaDowngrade();
            $('#jdarea').area({ hasOversea:isHasOversea, scopeLevel: 4, showLoading: false, initArea: originalIpLocation, cookieOpts:{path: '/', domain: 'jd.com', expires:30}, hasCommonAreas:$("#isLogin").val() == 1,
                onReady:function(local){
                    $.jCookie("ipLoc-djd", originalIpLocation, {path: '/', expires:30});
                }, onChange: function(area, local){
                    me.ipLocation = local.provinceId + '-' + local.cityId + '-' + local.districtId;
                    me.updateCartInfo(me.iurl + '/jcart' , null , '获取购物车失败' , null , true);
                }
            });
        },

        initSearchUnit: function(){
            var txt = '自营';
            $('#key').css('color', '#999');

            $("#key").val(txt).bind("focus", function(){
                if (this.value==txt){
                    this.value="";
                    this.style.color="#333";
            }}).bind("blur", function(){
                if (this.value==""){
                    this.value=txt;
                    this.style.color="#999";
                }
            });

            // 搜索：点击搜索 独立结构，引外部方法。
            $('body').delegate('.cart-search .button', 'click', function(){
                searchForCart($(this).prev().attr('id'));
            });

            // 搜索：enter
            $('body').delegate('.cart-search .itxt', 'keydown', function(event){
                event = event || window.event;
                if(event.keyCode == 13){
                    searchForCart($(this).attr('id'));
                }
            });
        },

        resetUnderline: function(){
            $('.floater').width($('.switch-cart-item').width());
        },

        // 弹出登录层，登录成功后跳转到购物车页面
        goToLogin: function(){
            try {
                var cartLoginUrl = PurchaseAppConfig.Domain + "/cart?rd="+Math.random();
                $("#isLogin").val(0);
                var me = this;
                me.doLogin({
                    modal: true,// false跳转,true显示登录注册弹层
                    returnUrl: cartLoginUrl,
                    'clstag1': "login|keycount|5|5",
                    'clstag2': "login|keycount|5|6",
                    firstCheck: false,
                    complete: function() {
                        me.setLogin();
                        window.location.href = cartLoginUrl;
                    }
                });
            } catch (e) {
                window.location.href = cartLoginUrl;
            }
        },
        /**
		 * 记录日志
		 */
        doLog : function() {
            try{
                if("undefined" != typeof log) {
                    log.apply(null, arguments);
                }
            }catch(e) {}
        },
        
        /**
		 * 调用用户登陆
		 * 
		 * @param config
		 */
        doLogin : function(config) {
            if ($("#isMiscdg").length>0 && $("#isMiscdg").val() == 1 && $("#hideMiscls").length>0 && $("#hideMiscls").val() == 1) {
                config.returnUrl = config.returnUrl || window.location.href;
                window.location.href = "//passport.jd.com/new/login.aspx?ReturnUrl=" + escape(config.returnUrl).replace(/\//g, "%2F");
            } else {
                login(config);
            }
        },

        /**
		 * 设置登录标记
		 * 
		 * @param result
		 */
        setLogin: function(result){
        	var removeNologinEl = function(){
        		var nologinEl = $('.nologin-tip');
    			if(nologinEl&&nologinEl.length){
    				nologinEl.remove();
    			}
        	}
        	if(result){
        		var isLogin = result.isLogin ? "1" : "0";
        		$("#isLogin").val(isLogin);
        		if(isLogin == "1"){
        			removeNologinEl();
        		}
        	}else{
        		var loginEl = $('#isLogin');
        		if(loginEl&&loginEl.length){
        			loginEl.val(1);
        		}
        		removeNologinEl();
        	}
        },

        // 去结算
        gotoBalance: function(binter){
            var selected = $(".item-selected");
            if(selected && selected.length){
                try {
                    if (binter) {
                        if ($('#overseaSelectedCount').val() > 110) {
                            this.showAlertDlg('勾选的商品太多啦', '单次结算商品不超过110件，请重新选择结算商品');
                            return;
                        }
                    } else {
                        if ($('#noOverseaSelectedCount').val() > 110) {
                            this.showAlertDlg('勾选的商品太多啦', '单次结算商品不超过110件，请重新选择结算商品');
                            return;
                        }
                    }
                    try{
	                    if(binter){this.doLog('newcart', 'clickcart','gotoorderoversea3');}
                        this.doLog('newcart', 'clickcart',$.jCookie("ipLoc-djd")); 
        			}catch(e){}
        			var me = this;
        			if(!me.toOrderDowngrade()){
        				// 区分京东国际结算 和 京东结算
                        var orderInfoUrl = PurchaseAppConfig.Domain +"/gotoOrder.action" + (binter ? '?flowId=10&rd=' : '?rd=') + Math.random();
                        if ($("#isLogin").val() == 0) {
                            $("#isLogin").val(0);
                            this.doLogin({
                                modal: true,// false跳转,true显示登录注册弹层
                                returnUrl: orderInfoUrl,
                                'clstag1': "login|keycount|5|5",
                                'clstag2': "login|keycount|5|6&sourcePage=noReg",
                                firstCheck: false,
                                complete: function() {
                                    $("#isLogin").val(1);
                                    window.location.href = orderInfoUrl;
                                }
                            });
                        }else{
                        	window.location.href = orderInfoUrl;
                        }
        			}else{
        				var hkInfoUrl = "//authorize.jd.hk/auth/auth.action";
                        var orderInfoUrl = "//trade.jd.com/shopping/order/getOrderInfo.action";
                        if ($('.submit-btn').attr('data-bind') == 5) {// data-bind==5, 京东国际合并支付，给结算传入标识
                        	orderInfoUrl += "?overseaMerge=1";
                        }
                        if ($("#isLogin").val() == 0) {
                            $("#isLogin").val(0);
                            this.doLogin({
                                modal: true,// false跳转,true显示登录注册弹层
                                returnUrl: PurchaseAppConfig.Domain,
                                'clstag1': "login|keycount|5|5",
                                'clstag2': "login|keycount|5|6&sourcePage=noReg",
                                firstCheck: false,
                                complete: function() {
                                    $("#isLogin").val(1);
                                    window.location.href = PurchaseAppConfig.Domain;
                                }
                            });
                        } else {
                        	if(binter){
                        		window.location.href = hkInfoUrl;
                        	}else{
                        		window.location.href = orderInfoUrl;
                        	}
                        }
        			}
                } catch (e) {
                    window.location.href = orderInfoUrl;
                }
            }else{
                if($('.cart-tiny-tips').length != 0) return;
                $('.submit-btn').after('<div class="cart-tiny-tips" style="width:160px;right:' + (this.t == "0" ? '-30' : '0') + 'px;top:-35px;"><i class="warn-ico"></i>请至少选择一件商品哟~</div>');
                setTimeout(function(){$('.cart-tiny-tips').remove();},1500);
            }
        },

        clearDialog: function(){
            var me = this;

            $('.item-item').each(function(){
                $(this).parent().css('z-index', 'auto');
                $(this).css('z-index', 'auto');
            });
            // 清除页面窗口
            $('.promotion-tips').each(function(){
                $(this).slideUp(200);
            });
			
			$('.price-switch-tips').each(function(){
                $(this).slideUp(200);
            });

            $('.jd-service-integration').each(function(){
                $(this).slideUp(200);
            });
            $('.giftcardbox-dialog').each(function(){
                // $(this).addClass('hide');
                $(this).slideUp(200);
            });
            // 清除专属定制窗口
            $('.recustomize-dialog').addClass('hide');
            
            $('.gift-box').each(function(){
                $(this).hide();
                if(me.isLowIE()){
                    $(this).closest('.item-header').parent().css('z-index', 'auto');
                }
            });

            $('.selected-item-list').hide();
            $('.amount-sum b').removeClass('down').addClass('up');
            // 清除页面无货找相似
            me.hideAllStockSimilar();
            // 清除赠品池窗口
            $('.gift-3c-title,.gift-3c-main').addClass('hide');
            $('.gift-3c-main-expan').addClass('hide');
            // 清除滞销窗口
            $('.unmarket-more-dialog').each(function(){
                $(this).addClass('hide');
            });
        },

        // 吸底
        ceilingAlamp: function(){
            try{
                var lampEl = $('.ui-ceilinglamp-1');
                if(!this.alamp || !lampEl.length){
                    this.alamp = new ceilinglamp($('.cart-toolbar'));
                    this.alamp.options = {
                        currentClassName:'fixed-bottom',
                        zIndex:999,
                        top:0,
                        pos:1,
                        bchange:1,
                        sCss:'fdibu',
                        dCss:'fdibucurrent',
                        callback:show
                    };
                    this.alamp.init();
                }
            }catch(err){}

            // 吸底回调
            function show(ev){
                var el = $('.cart-toolbar');
                if(ev == 'show'){
                    $('.fore1', el).hide();
                    $('.fore2', el).show();
                } else {
                    $('.fore2', el).hide();
                    $('.fore1', el).show();
                }
            }
        },
        
        // 初始化购物车侧边栏
        initCartSidebar : function(callback) {
            var scope = this;
            if(scope.favoriteDowngrade()) {
                pageConfig.hideCartFollow = true;
            }
            if($('#container').attr('ecarddg') == "1") {
            	pageConfig.hideEcard = true;
            }
            if($('#container').attr('cartAlwaysDg') == "1") {
                pageConfig.hideCartAlways = true;
            }
            require.async('user/cart/widget/cart-sidebar/cart-sidebar', function(cartSidebar){
                scope.cartSidebar = cartSidebar;
                if(callback) {
                    callback(cartSidebar);
                }
            });
            $('body').delegate('#J-global-toolbar .add-cart-button', 'click', function(){
                var $el = $(this);
                cartObj.jGate($el.attr('_pid'), 1, 1, 0, 0, function(){});
            });
        },

        initJInitButtons: function(){
            var state= $('#checkedCartState').val();
            if(state == 1 || state == 2 || state == 4 || state == 5){
                $('.normal').show();
                $('.combine').hide();
                $('.submit-btn').attr('data-bind', state);
            }else if(state == 3){
                $('.combine').show();
            	$('.jdInt-submit-btn-hd').show();
                $('.common-submit-btn').show();
                $('.normal').hide();
            }
            this.arrowReset();
        },
        
        arrowReset : function(){
            var _$sum= $('.combine:visible, .normal:visible').find('.amount-sum');
            if(_$sum.length>0) {
                $('.selected-item-list .arr').css('right', _$sum.parent().width()-_$sum.position().left-_$sum.width()/2);
            }
        },

        initShowListEvent: function(){
            var me = this;
            $('body').delegate('.amount-sum', 'click', function(event){
                var _this = $('b', $(this));
                var pnode = _this.closest('.toolbar-wrap');

                if(_this.hasClass('up')){
                    // 获取选中商品列表
                    var outSkus = me.outSkus;
                    jQuery.ajax({
                        type     : "POST",
                        dataType : "json",
                        url  : me.iurl + '/getSwitchableBody.action',
                        data : "outSkus=" + outSkus + "&t=" +me.t + "&random=" + Math.random(),
                        success : function(result) {
                    	    me.setLogin(result);
                            if(result && result.l == 1){
                                me.goToLogin();
                                return;
                            }
                            result = result.sortedWebCartResult;
                            $('.selected-item-list').prop('outerHTML', result.modifyResult.switchableBodyHtml);
                            $('.selected-item-list', pnode).show();

                            var state= $('#checkedCartState').val();
                            if(state == 1 || state == 4 || state == 2 || state == 5){
                                $('.normal-selected-list').show();
                                $('.combine-selected-list').hide();
                            }else if(state == 3){
                                $('.combine-selected-list').show();
                                $('.normal-selected-list').hide();
                            }

                            var sele = $('.selected-inner');

                            sele.find('div').switchable({
                                type:'slider',
                                prevClass:'prev',
                                nextClass:'next',
                                pagCancelClass:'disabled',
                                seamlessLoop:false,
                                step:10,
                                visible:10,
                                hasPage:true,
                                autoLock:true,
                                width:92
                            });

                            if (sele.find('li').length > 10) {
                                sele.find('.prev').show();
                                sele.find('.next').show().removeClass('disabled');
                            }

                            // 京东国际和普通商品
                            var iele = $('.int-selected-inner');

                            iele.find('div').switchable({
                                type:'slider',
                                prevClass:'prev',
                                nextClass:'next',
                                pagCancelClass:'disabled',
                                seamlessLoop:false,
                                step:5,
                                visible:5,
                                hasPage:true,
                                autoLock:true,
                                width:92
                            });

                            if (iele.find('li').length > 5) {
                                iele.find('.prev').show();
                                iele.find('.next').show().removeClass('disabled');
                            }

                            // 普通商品
                            var nele = $('.normal-selected-inner');

                            nele.find('div').switchable({
                                type:'slider',
                                prevClass:'prev',
                                nextClass:'next',
                                pagCancelClass:'disabled',
                                seamlessLoop:false,
                                step:4,
                                visible:4,
                                hasPage:true,
                                autoLock:true,
                                width:92
                            });

                            if (nele.find('li').length > 4) {
                                nele.find('.prev').show();
                                nele.find('.next').show().removeClass('disabled');
                            }
                            me.arrowReset();
                        },
                        error:function(XMLHttpResponse ){
                        }
                    });

                    _this.removeClass('up').addClass('down');
                    me.doLog('newcart', 'clickcart','suolvetuzhankai');
                } else{
                    $('.selected-item-list', pnode).hide();
                    _this.removeClass('down').addClass('up');
                    me.doLog('newcart', 'clickcart','suolvetuzhedie');
                }
                event.stopPropagation();
                return false;
            });
        },

        initRecommendAndCollection: function(ids){
            if(ids){
                $('#ids').val(ids);
            }

            // if($("#ids").val()){
            someMoreRecommend($("#ids").val() || '');
            // }
            
            // 点击推荐位中<加入购物车>按钮，当购物车为空时，也支持添加到购物车
            $('body').delegate('#c-tabs-new .p-btn a', 'click', function(){
                var $el = $(this);
                cartObj.jGate($el.attr('_pid'), 1, 1, 0, 0, function(){
                    $el.closest(".p-btn").after('<div class="addsucc-tips"><i></i><span>成功加入购物车</span></div>');
                    setTimeout(function(){
                        $('#c-tabs-new .addsucc-tips').remove();
                    }, 500);
                });
            });
            $('body').delegate('#favorite-products .login-in', 'click', function(){
                cartObj.goToLogin();
            });
        },

        showTipInfo: function(objel, info, bright, bup){
            $('body').append(info);

            var tipEl = $('.op-tipmsg');

            if(objel){
                var left = objel.offset().left;
                left = bright ? (left + 20) : (left - 60);

                var top = objel.offset().top;
                top = (bup ? (top-35) : top);

                tipEl.css('top', top + 'px');
                tipEl.css('left', left + 'px');
            } else{
                var width = ($('.follow-batch').offset().left + $('.follow-batch').outerWidth() + 5) + 'px';
                tipEl.css('bottom', '10px');
                tipEl.css('left', width);
                tipEl.css('position', 'fixed');
                tipEl.css('z-index', '999');
            }

            tipEl.show();

            setTimeout(function(){
                tipEl && tipEl.remove();
            }, 2000);
        },

        closeTipInfo: function(){
            $('.op-tipmsg') && $('.op-tipmsg').remove();
        },

        showAlertDlg: function(msg, des){
            var sysErrorDialog = $('body').dialog({
                title: null,
                width: 418,
                height: 240,
                type:'html',
                fixed: true,
                source:'<div class="ui-dialog-content"><div class="cart-warn-sysdialog ac">' +
                            '<i class="warn-tip-ico"></i><p class="tit">' + msg + '</p>' +
                            (des ? '<p class="cont">' + des + '</p><p><a href="#none" class="btn-1">知道了</a></p>' : '<p><a href="#none" class="btn-1 mt20">知道了</a></p>') +
                        '</div></div>' +
                        '<a class="ui-dialog-close" title="关闭"><span class="ui-icon ui-icon-delete"></span></a>',
                onReady: function() {
                    $('.cart-warn-sysdialog .btn-1').click(function(){sysErrorDialog.close();});
                }
            });
        },
        
        showAlertDlgWithTime: function(showTime, msg, des){
            var sysErrorDialog = $('body').dialog({
                title: null,
                width: 320,
                height: 190,
                type:'html',
                fixed: true,
                source:'<div class="ui-dialog-content"><div class="cart-warn-sysdialog ac">' +
                '<i class="warn-tip-ico"></i><p class="tit">' + msg + '</p>' +
                '</div></div>',
                onReady: function() {
                	if (!showTime) showTime = 1000;
                    setTimeout(function () {
                    	sysErrorDialog.close();
                    }, showTime);
                }
            });
        },

        isLowIE: function(){
            if(document.documentMode == 7){
                return true;
            }

            if($.browser.isIE7() || $.browser.isIE6()){
                return true;
            }
        },

        loadShopInfo:function(isMdxxdg){
            if(isMdxxdg == 1) return;
            var lsids = "";
            $('.props-txt-l[data^="shopid_"]').each(function(){
                var shopid = $(this).attr("data");
                var pvsid = shopid.substring(shopid.indexOf("_") + 1);
                lsids = lsids + pvsid + ",";
            });
            if(lsids == ""){
                return
            }
            lsids = lsids.substring(0, lsids.length-1);
            jQuery.ajax({
                type : "POST",
                dataType : "json",
                url : this.iurl + '/loadShopInfo.action',
                data : "lsids=" + lsids,
                success : function(result) {
                    if(result && result.locShopInfoResult){
                        var locShopInfoResult = result.locShopInfoResult;
                        $('.props-txt-l[data^="shopid_"]').each(function(i, obj){
                            var shopid = $(obj).attr("data");
                            var pvsid = shopid.substring(shopid.indexOf("_") + 1);
                            $(obj).html("门店：" + locShopInfoResult[pvsid]);
                            $(obj).attr("title", locShopInfoResult[pvsid]);
                        });
                    }
                },
                error : function(){
                }
            });
        },

        showDepreciate : function() {
            $('.cuttip').tips({
                tipsClass:'cuttips',
                type:'hover',
                hasArrow:false,
                hasClose:false,
                align:['top','left'],
                autoWindow:true
            });
			$(".cart-filter-top-popup").remove();
			if ($("#isShowDepreNotice").val() === "true") {
        	    var el = $($("[depreciate]")[0]).closest(".item-item");
        	    if (!el.attr("id")) {
        	    	el.attr("id","depreciate");
        	    }
        	    $(".switch-cart").after('<div class="cart-filter-top-popup"><em class="ftx-01">降价</em><span>购物车中' + $("[depreciate]").length 
        	    		+ '件商品已降价</span><a href="#' + (el.attr("id")? el.attr("id"): "depreciate") + '" t="depreciate">查看</a><i class="icon-popup-cls" onclick="$(\'.cart-filter-top-popup\').remove()"></i></div>');
        	}
        },

        showInstallment : function() {
            try {
            	this.showInstallNotice = false;
            	if(this.installmentDowngrade()) {
            		return;
            	}
            	var me = this;
            	var skus = "";
                $('[product]').each(function() {
	        		skus+="{skuId:" + $(this).attr("skuid") + ",cid:" + $(this).attr("cid") + ", sid:" + $(this).attr("sid") +
	        		",oversea:"+ $(this).attr("oversea") + ", venderId:" + $(this).attr("venderid") + "},";
	        	});
                if (skus.length > 0) {
                	jQuery.ajax({
	                    type : "POST",
	                    dataType : "json",
	                    url : this.iurl + '/getInstallmentInfo.action',
	                    data: {skus : "["+skus+"]"},
	                    success : function(result) {
	                        if (result && result.installmentResult) {
	                        	for (i in result.installmentResult) {
	                        		$('[bt]','[skuid="' + i +'"][product]').each(function() {
	                        			$(this).html('<span installment class="pro-tiny-tip" data-tips="白条'+result.installmentResult[i]+'期免息">白条'+result.installmentResult[i]+'期免息</span>');
	                        		});
	                        	}
	                        	me.showInstallNotice = true;
	                        }
	                        me.showHeadNotice();
	                    },
	                    error : function(){
	                    	me.showHeadNotice();
	                    }
	                });
                }
            } catch(e) {}
        },

        showHeadNotice : function() {
        	try {
        		if(this.t  == this.myfridge){
        			return;
        		}
        		if (this.headNoticeDg()) {
        			return;
        		}
        		
        	    if (this.showInstallNotice && $("#isShowDepreNotice").val() !== "true") {
					$(".cart-filter-top-popup").remove();
        	    	var el = $($("[installment]")[0]).closest(".item-item");
        	    	if (!el.attr("id")) {
        	    		el.attr("id","installment");
        	    	}
        	    	$(".switch-cart").after('<div class="cart-filter-top-popup"><em class="ftx-01">免息</em><span>购物车中' + $("[installment]").length 
        	    			+ '件商品已享白条免息</span><a href="#' + (el.attr("id")? el.attr("id"): "installment") + '" t="installment">查看</a><i class="icon-popup-cls" onclick="$(\'.cart-filter-top-popup\').remove()"></i></div>');
        	    }
        	} catch(e){}
        },

        initGiftPoolEvent: function(){
            var me = this;
            // 展示赠品池框
            $('.cart-warp').delegate('.gift-edit', 'click', function(e){
                me.clearDialog();
                var giftPoolType = $(this).attr('giftPoolType');
                var editOffsetLeft = Math.floor($('.gift-edit', $(this).closest('.item-item')).offset().left);
                var editOffsetTop = Math.floor($('.gift-edit', $(this).closest('.item-item')).offset().top);
                if (giftPoolType === "1") {
                	$('.gift-3c-main-expan', $(this).closest('.item-item')).removeClass('hide');
                    $('.gift-3c-main-expan', $(this).closest('.item-item')).offset({top: editOffsetTop + 25, left: editOffsetLeft - 5});
                } else {
                	$('.gift-3c-title, .gift-3c-main', $(this).closest('.item-item')).removeClass('hide');
                    $('.gift-3c-title', $(this).closest('.item-item')).offset({top: editOffsetTop - 4, left: editOffsetLeft - 10});
                    $('.gift-3c-main', $(this).closest('.item-item')).offset({top: editOffsetTop + 22, left: editOffsetLeft - 10});
                }
                if(me.isLowIE()){
                  $(this).closest('.item-item').parent().css('z-index', 2);
                  $(this).closest('.item-item').css('z-index', 20);
                }
            });
            this.initSingleGiftPoolEvent();
            this.initMultiGiftPoolEvent();
        },
        
        // 单选赠品池初始化
        initSingleGiftPoolEvent: function(){
            var me = this;
            // 取消按钮
            $('.cart-warp').delegate('.gift-3c-main .btn-9', 'click', function(e){
                $('.gift-3c-title, .gift-3c-main', $(this).closest('.item-item')).addClass('hide');
            });
            // 确定按钮
            $('.cart-warp').delegate('.gift-3c-main .btn-1', 'click', function(e){
                var pids = $(this).attr('product_info').split('_');
                var giftids = '';
                var selectGiftItems = $('.gift-3c-main .item-sel', $(this).closest('.item-item'));
                for(var i=0; i<selectGiftItems.length; i++){
                    giftids += $(selectGiftItems[i]).attr('gift_id') + ',';
                }
                if ($(this).attr('select_ids') == giftids) {
                    $('.gift-3c-title, .gift-3c-main', $(this).closest('.item-item')).addClass('hide');
                    return;
                }
                var act = '/changePoolGifts.action';
                var params = "gids=" + giftids
                		   + "&giftPoolType=0"
                           + "&pid=" + pids[0]
                           + "&targetId=" + pids[1]
                           + "&ptype=" + pids[2]
                			+ "&t=" + me.t
                           + "&outSkus=" + me.outSkus
                           + "&random=" + Math.random();
                me.updateProductInfo(me.iurl + act, params, '修改赠品失败');
            });
            // 点击赠品池赠品
            $('.cart-warp').delegate('.gift-3c-switch-item', 'click', function(e) {
                if($(this).hasClass('item-sel')){
                    return;
                }
                $(this).closest('.gift-3c-item').find('.item-sel').removeClass('item-sel');
                $(this).addClass('item-sel').closest('.gift-3c-item').find('.switch-item-name').html($(this).attr('gift_name'))
                .attr('title', $(this).attr('gift_name')).attr('href', '//item.jd.com/' + $(this).attr('gift_id') + '.html');
                $(this).closest('.gift-3c-item').find('.num').html($(this).attr('gift_num')).attr('num',$(this).attr('gift_num'));
            });
            // hover赠品池赠品
            $('.cart-warp').delegate('.gift-3c-switch-item', 'hover', function(e) {
                if($(this).hasClass('item-sel')){
                    return;
                }
                if( e.type === 'mouseenter' ) {
                    $(this).closest('.gift-3c-item').find('.switch-item-name').html($(this).attr('gift_name'));
                    $(this).closest('.gift-3c-item').find('.num').html($(this).attr('gift_num'));
                } else {
                    $(this).closest('.gift-3c-item').find('.switch-item-name').html($(this).closest('.gift-3c-item').find('.switch-item-name').attr('title'));
                    $(this).closest('.gift-3c-item').find('.num').html($(this).closest('.gift-3c-item').find('.num').attr("num"));
                }
            });
        },
        
        // 多选赠品池初始化
        initMultiGiftPoolEvent: function(){
            var me = this;
            // 取消按钮
            $('.cart-warp').delegate('div.gift-3c-main-expan div.btn-9', 'click', function(e){
            	$('.gift-3c-main-expan', $(this).closest('.item-item')).addClass('hide');
            });
            // 确定按钮
            $('.cart-warp').delegate('div.gift-3c-main-expan div.btn-1', 'click', function(e){
            	var confirmBtn = this;
                var pids = $(this).attr('product_info').split('_');
                var giftids = '';
                
                var totalNum = Number($(this).attr('selectGiftNum'));// 已选数量
                var giftBaseNum = Number($(this).attr('giftBaseNum'));// 最大可选数量
                if (giftBaseNum > totalNum) {
                	var diffNum = Number(giftBaseNum -totalNum);// 最大可增加数量
                	// 提示差diffNum件，是否帮选
                	var htmlStr = "<div class='ui-dialog common-tips-dialog'><div class='ui-dialog-content'><div class='common-tips-dialog ac'>" +
                    "<div class='common-tips-icon-cont'><i class='common-tips-icon confirm'></i></div>" +
                    "<p class='common-tips-tit'>还差" + diffNum + "件商品未选，我们将帮您挑选</p>" +
                    "<p class='common-tips-opts mt15'>" +
                      "<a href='#none' class='comon-tips-btn yes'>好的</a>" +
                      "<a href='#none' class='comon-tips-btn no ml10'>自己选</a>" +
                    "</p>" +
                  "</div></div></div>";
                	
                	var sysErrorDialog = $('body').dialog({
                        title: null,
                        width: 418,
                        height: 210,
                        type:'html',
                        fixed: true,
                        source: htmlStr,
                        onReady: function() {
                            $('.common-tips-dialog .yes').click(function(){
                            	cartHelpSelect();
                            	sysErrorDialog.close();
                            });
                            $('.common-tips-dialog .no').click(function(){
                            	sysErrorDialog.close();
                            });
                        }
                    });
                	
                	var cartHelpSelect = function () {
                		var giftItems = $('.gift-3c-main-expan .gift-3c-expan-item', $(confirmBtn).closest('.item-item'));
                    	if (!$(giftItems[0]).hasClass('gsc-selected')) {
                    		$(giftItems[0]).addClass('gsc-selected');
                    		$(giftItems[0]).find('.itxt').val(diffNum);
                    	} else {
                    		$(giftItems[0]).find('.itxt').val(Number($(giftItems[0]).find('.itxt').val()) + diffNum);
                    	}
                    	$(giftItems[0]).find('.gift-3c-expan-quantity').attr('changeBeforeNum', Number($(giftItems[0]).find('.itxt').val()));
                    	$(confirmBtn).attr('selectGiftNum', totalNum + diffNum);
                    	gsDecrementDisabled($(giftItems[0]).find('.gift-3c-expan-quantity').children('.gs-decrement'), $(giftItems[0]).find('.itxt').val());
                    	changeBtnInfo($(confirmBtn).closest('.gift-3c-main-expan').find('.gift-3c-btn-info'), giftBaseNum, $(confirmBtn).attr('selectGiftNum'));
                	}
                	return;
                }
                
                var selectGiftItems = $('.gift-3c-main-expan .gsc-selected', $(this).closest('.item-item'));
                for(var i=0; i<selectGiftItems.length; i++){
                    giftids += $(selectGiftItems[i]).attr('gift_id') + '_' + $(selectGiftItems[i]).find('.itxt').val() + ',';
                }
                // TODO 校验是否重复
//                if ($(this).attr('select_ids') == giftids) {
//                    $('.gift-3c-title, .gift-3c-main', $(this).closest('.item-item')).addClass('hide');
//                    return;
//                }
                var act = '/changePoolGifts.action';
                var params = "gids=" + giftids
                           + "&giftPoolType=1"
                           + "&pid=" + pids[0]
                           + "&targetId=" + pids[1]
                           + "&ptype=" + pids[2]
                			+ "&t=" + me.t
                           + "&outSkus=" + me.outSkus
                           + "&random=" + Math.random();
                me.updateProductInfo(me.iurl + act, params, '修改赠品失败');
            });
            // 输入框激活，记录初始数量
            $('.cart-warp').delegate('div.gift-3c-expan-quantity input', 'focus', function(event){
            	var targetNum = parseInt($(this).val());
                if(isNaN(targetNum)){
                    return;
                }
                $(this).closest('.gift-3c-expan-quantity').attr('changeBeforeNum', targetNum);
            });
            
            // 输入框修改数量
            $('.cart-warp').delegate('div.gift-3c-expan-quantity input', 'change', function(event){
            	var quantityDiv = $(this).closest('.gift-3c-expan-quantity');
            	var targetNum = Number($(this).val());
            	var changeBeforeNum = Number(quantityDiv.attr('changeBeforeNum'));
                if(isNaN(targetNum)){
                	quantityDiv.children('.itxt').val(changeBeforeNum);
                	me.showAlertDlgWithTime(1000, "请输入正整数");
                    return;
                }
                if (targetNum < 1 || Math.round(targetNum) !== targetNum) {
                	quantityDiv.children('.itxt').val(changeBeforeNum);
                	me.showAlertDlgWithTime(1000, "请输入正整数");
                	return;
                }
                if (changeBeforeNum === targetNum) {
                	return;
                }
                var confirmBtn = $(this).closest('.gift-3c-main-expan').find('.btn-1');
            	var totalNum = Number(confirmBtn.attr('selectGiftNum')); // 已选数量
            	var giftBaseNum = Number(confirmBtn.attr('giftBaseNum'));// 最大可选数量
            	
            	// 是否选中，判断增减
            	if($(this).closest('.gift-3c-expan-item').hasClass('gsc-selected')){
            		if (changeBeforeNum < targetNum) {// 增加
            			var diffNum = Number(giftBaseNum -totalNum);// 最大可增加数量
            			if (diffNum == 0) {
            				me.showAlertDlgWithTime(1000, "最多可选" + giftBaseNum + "件商品");
            				quantityDiv.children('.itxt').val(changeBeforeNum);
            				return;
            			}
            			if ((targetNum - changeBeforeNum) > diffNum) {
                    		// TODO提示最多可领取，并修改数量为最大可增加数量
            				me.showAlertDlgWithTime(1000, "最多可选" + giftBaseNum + "件商品");
                    		targetNum = diffNum + changeBeforeNum;
                    		quantityDiv.children('.itxt').val(targetNum);
                    	}
            		} 
            		confirmBtn.attr('selectGiftNum', totalNum - changeBeforeNum + targetNum);
                } else {
                	var diffNum = Number(giftBaseNum -totalNum);// 最大可增加数量
                	if (diffNum == 0) {
                		me.showAlertDlgWithTime(1000, "最多可选" + giftBaseNum + "件商品");
        				quantityDiv.children('.itxt').val(changeBeforeNum);
        				return;
        			}
                	if (targetNum > diffNum) {
                		// 提示最多可领取，并修改数量为最大可增加数量
                		me.showAlertDlgWithTime(1000, "最多可选" + giftBaseNum + "件商品");
                		targetNum = diffNum;
                		quantityDiv.children('.itxt').val(targetNum);
                	}
        			confirmBtn.attr('selectGiftNum', totalNum + targetNum);
        			$(this).closest('.gift-3c-expan-item').addClass('gsc-selected');
                }
            	// 同步最后修改数量
            	quantityDiv.attr('changeBeforeNum', targetNum);
            	gsDecrementDisabled(quantityDiv.children('.gs-decrement'), targetNum);
            	changeBtnInfo($(this).closest('.gift-3c-main-expan').find('.gift-3c-btn-info'), giftBaseNum, confirmBtn.attr('selectGiftNum'));
            });
            
            // 点击赠品池赠品
            $('.cart-warp').delegate('div.gift-3c-expan-item div.gs-item-img', 'click', function(e) {
            	if (!(e.target.tagName == "IMG" || e.target.tagName == "img")) {
            		return;
            	}
            	var confirmBtn = $(this).closest('.gift-3c-main-expan').find('.btn-1');
            	var totalNum = Number(confirmBtn.attr('selectGiftNum')); // 已选数量
            	var giftBaseNum = Number(confirmBtn.attr('giftBaseNum'));// 最大可选数量
            	var targetNum = Number($(this).closest('.gift-3c-expan-item').find('.itxt').val());// 操作赠品当前选中数量
            	
                if($(this).parent('.gift-3c-expan-item').hasClass('gsc-selected')){
                	$(this).parent('.gift-3c-expan-item').removeClass('gsc-selected');
                	confirmBtn.attr('selectGiftNum', totalNum - targetNum);
                } else {
                	// 主品数为1，且用户已选一件时，操作处理为单选效果，可直接更换选中商品
                	if (giftBaseNum == 1 && totalNum == 1) {
                		var selectGiftItems = $('.gift-3c-main-expan .gsc-selected', $(this).closest('.item-item'));
                		if ($(selectGiftItems[0]).hasClass('gsc-selected')) {
                			$(selectGiftItems[0]).removeClass('gsc-selected');
                		}
                	} else {
                		if (totalNum >= giftBaseNum) {
                    		// 提示不能领取
                    		me.showAlertDlgWithTime(1000, "最多可选" + giftBaseNum + "件商品");
                    		return;
                    	}
                    	var diffNum = Number(giftBaseNum -totalNum);// 最大可增加数量
                    	if (targetNum > diffNum) {
                    		// 提示最多可领取，并修改数量为最大可增加数量
                    		me.showAlertDlgWithTime(1000, "最多可选" + giftBaseNum + "件商品");
                    		targetNum = diffNum;
                    		$(this).closest('.gift-3c-expan-item').find('.gift-3c-expan-quantity').children('.itxt').val(targetNum);
                    	}
                    	confirmBtn.attr('selectGiftNum', totalNum + targetNum);
                	}
                	$(this).closest('.gift-3c-expan-item').addClass('gsc-selected');
                }
                gsDecrementDisabled($(this).closest('.gift-3c-expan-item').find('.gift-3c-expan-quantity').children('.gs-decrement'), targetNum);
            	changeBtnInfo($(this).closest('.gift-3c-main-expan').find('.gift-3c-btn-info'), giftBaseNum, confirmBtn.attr('selectGiftNum'));
            });
            
            // 点击赠品池增加数量
            $('.cart-warp').delegate('a.gs-increment', 'click', function(e) {
            	var confirmBtn = $(this).closest('.gift-3c-main-expan').find('.btn-1');
            	// 判断是否达到最大数量，return
            	var totalNum = Number(confirmBtn.attr('selectGiftNum')); // 已选数量
            	var giftBaseNum = Number(confirmBtn.attr('giftBaseNum')); // 最大可选数量
            	if (totalNum >= giftBaseNum) {
            		me.showAlertDlgWithTime(1000, "最多可选" + giftBaseNum + "件商品");
            		return;
            	}
            	var addNum = Number($(this).closest('.gift-3c-expan-quantity').children('.itxt').val()) + 1;// 目标增加数量
            	var diffNum = Number(giftBaseNum -totalNum);// 最大可增加数量
            	
            	// 判断是否已选择，未选加样式，修改已选数量
            	if (!$(this).closest('.gift-3c-expan-item').hasClass('gsc-selected')) {
            		if (addNum > diffNum) {
            			me.showAlertDlgWithTime(1000, "最多可选" + giftBaseNum + "件商品");
                		addNum = diffNum;
                	}
            		$(this).closest('.gift-3c-expan-item').addClass('gsc-selected');
            		confirmBtn.attr('selectGiftNum', totalNum + addNum);
            	} else {
            		confirmBtn.attr('selectGiftNum', totalNum + 1);
            	}
            	
            	// 修改数量
            	$(this).closest('.gift-3c-expan-quantity').attr('changeBeforeNum', addNum);
            	$(this).closest('.gift-3c-expan-quantity').children('.itxt').val(addNum);
            	gsDecrementDisabled($(this).closest('.gift-3c-expan-quantity').children('.gs-decrement'), addNum);
            	changeBtnInfo($(this).closest('.gift-3c-main-expan').find('.gift-3c-btn-info'), giftBaseNum, confirmBtn.attr('selectGiftNum'));
            });
            
            // 点击赠品池减少数量
            $('.cart-warp').delegate('a.gs-decrement', 'click', function(e) {
            	// 判断是否为1不可减
            	var delNum = Number($(this).closest('.gift-3c-expan-quantity').children('.itxt').val()) - 1// 目标减少数量
            	if (delNum < 1) {
            		gsDecrementDisabled($(this).closest('.gift-3c-expan-quantity').children('.gs-decrement'), 1);
            		return;
            	}
            	var confirmBtn = $(this).closest('.gift-3c-main-expan').find('.btn-1');
            	// 判断是否已选中
            	var giftBaseNum = Number(confirmBtn.attr('giftBaseNum'));// 最大可选数量
            	var totalNum = Number(confirmBtn.attr('selectGiftNum')); // 已选数量
            	if (!$(this).closest('.gift-3c-expan-item').hasClass('gsc-selected')) {
                	if (totalNum >= giftBaseNum) {
                		// 提示不能领取
                		me.showAlertDlgWithTime(1000, "最多可选" + giftBaseNum + "件商品");
                		return;
                	}
                	var diffNum = Number(giftBaseNum - totalNum);// 最大可增加数量
                	if (delNum > diffNum) {
                		// TODO提示最多可领取，并修改数量为最大可增加数量
                		me.showAlertDlgWithTime(1000, "最多可选" + giftBaseNum + "件商品");
                		delNum = diffNum;
                	}
                	// 增加选中样式，修改已选数量
            		$(this).closest('.gift-3c-expan-item').addClass('gsc-selected');
            		confirmBtn.attr('selectGiftNum', totalNum + delNum);
            	} else {
            		confirmBtn.attr('selectGiftNum', totalNum - 1);
            	}
            	$(this).closest('.gift-3c-expan-quantity').attr('changeBeforeNum', delNum);
            	$(this).closest('.gift-3c-expan-quantity').children('.itxt').val(delNum);// 修改数量
            	gsDecrementDisabled($(this).closest('.gift-3c-expan-quantity').children('.gs-decrement'), delNum);
            	changeBtnInfo($(this).closest('.gift-3c-main-expan').find('.gift-3c-btn-info'), giftBaseNum, confirmBtn.attr('selectGiftNum'));
            });
            
            // 减少按钮添加禁用class
            var gsDecrementDisabled = function (gsDecrement, num) {
            	if (num == 1 && !gsDecrement.hasClass('disabled')) {
            		gsDecrement.addClass('disabled');
    			} else if (num > 1 && gsDecrement.hasClass('disabled')) {
    				gsDecrement.removeClass('disabled');
    			}
            };
            
            // 动态调整选中赠品文案
            var changeBtnInfo = function (btnInfoDiv, giftBaseNum, totalNum) {
            	if (Number(giftBaseNum) == Number(totalNum)) {
            		btnInfoDiv.html("<span>已选" + giftBaseNum + "件<i class='J_gs-info-tips' data-tips='每件商品可自由挑选1件赠品'></i></span>");
            	} else {
            		btnInfoDiv.html("<span>应选" + giftBaseNum + "件，还差" + (giftBaseNum - totalNum) + "件<i class='J_gs-info-tips' data-tips='每件商品可自由挑选1件赠品'></i></span>");
            	}
				$('.J_gs-info-tips').tips({
                    type: 'hover',
                    align: ['top'],
                    hasClose: false,
                    tipsClass: 'gift-tiny-tip-style',
                    callback: function(trigger, obj) {
                      $(obj).offset({left:$(obj).offset().left-12});
                    }
                });
            };
        },

        getOptimalPromo : function () {
        	try {
        		var me = this;
        		$("#J_promotion_toast_cont").remove();
            	$("#J_promotion_toast").remove();
	        	if ($("#isLogin").val() == "0" || me.t ==  me.myfridge || !$("#ids").val() || $("[suit].item-selected").length > 0 || 
	        			$("div.cell.p-price[noCalop='1']").length > 0 || me.optimalPromoDowngrade()) {
	        		me.opPromoShow = false;
	        		me.cartSmartFloatTips();
	        		return;
	        	}
	        	if (me.clickOp) {
            		$("#cart-list").prepend('<div id="opSucc" class="promotion-toast succ"><b></b><span>修改促销成功</span></div>');
            		setTimeout(function(){$("#opSucc").remove()},1500);
            		me.clickOp = false;
            		return;
            	}
	        	var skus = "";
				var isCheckedPlus95 = false;
	        	$("[calop]").each(function (){
	        		// 商品存在plus95折促销，不调用
	        		if ($(this).attr("plus95discount") == "true" || $(this).attr("plus95discount") == true) {
	        			isCheckedPlus95 = true;
		        		return false;
	        		}
	        		var selectPromotion = $('input:radio:checked', $(this).find('.promotion-tips'));
					var selectUnitPromotion = $('input:radio:checked', $(this).find('.price-switch-cont'));
	        		skus+="{skuId:" + $(this).attr("skuid") + ",num:" + $(this).attr("num") +
	        		((selectPromotion.length > 0 && Number(selectPromotion.attr('promotionId')) != Number(-300)) ? (",promotionId:" + selectPromotion.attr('promotionId') + ",promotionType:" + selectPromotion.attr('promotionType')) : "") +
					((selectUnitPromotion.length > 0 && Number(selectUnitPromotion.attr('upid')) != Number(-1)) ? (",unitPromotionId:" + selectUnitPromotion.attr('upid') + ",unitPromotionType:" + selectUnitPromotion.attr('uptype')) : "") +
	        		",cid:"+ $(this).attr("cid") + ", venderId:" + $(this).attr("venderid") + ", shopId:" + $(this).attr("shopid") +
	        		",zy:" + $(this).attr("zy") + ",flashPurchase:" + $(this).attr("flashpurchase") +
	        		",oversea:" + $(this).attr("oversea") + ",cancelPlus:" + $(this).attr("cancelPlus") +
	        		($(this).attr("storeId")?(",storeId:"+$(this).attr("storeId")):"") +
	        		($(this).attr("jbid")?(",jbId:"+$(this).attr("jbid")+"},"):"},");
	        	});
	        	
	        	// FIXME 勾选存在plus95折促销商品不调用最优促销接口，待最优促销接口支持
	        	if (isCheckedPlus95 || skus.length == 0) {
	        		me.opPromoShow = false;
	        		me.cartSmartFloatTips();
	        		return ;
	        	}
	        	
	        	skus = skus.substring(0, skus.length-1);
	        	var url = me.iurl + "/getOptimalPromo.action";
	        	var data = {skus : "["+skus+"]", fictVenderIds: $("#fictVenderIds").val()};
	        	if (me.isCartAsyncRequest("isOpAsyc")) {
	        		url = "//api.m.jd.com/api";
	        		data = me.getApiData("pcCartSOA_optimalPromo_getOptimalPromo", data);
	        	}
	            jQuery.ajax({
	                url: url,
	                type : "POST",
	                dataType: "json",
                xhrFields: {
                	withCredentials: true
                },
                crossDomain: true,
	                data: data,
	                success: function (result) {
						if (me.isCartAsyncRequest("isOpAsyc")) {
	                		if (result && result.code == 1) {
	                			result = result.resultData;
	                		} else {
	                			result = null;
	                		}
	                	}
	                    if (result && result.promoPrice && result.newPromoRela) {
	                    	var totalPrice = $(".sumPrice em").html();
	                    	var balance = PurchaseAppConfig.sub(totalPrice.substring(1,totalPrice.length), result.promoPrice, 0);
	                    	if (balance >= 1) {
	                    		var param = "";
	                    		// FIXME 新最优促销返回值处理,仅对Plus切换做处理
	                    		for (i in result.newPromoRela) {
                    				if (result.newPromoRela[i] && (result.newPromoRela[i]["multiPromoId"] || result.newPromoRela[i]["unitPromoId"])) {
                    					var unitPromoId = result.newPromoRela[i]["unitPromoId"];
                    					if (Number(result.newPromoRela[i]["unitPromoTag"]) == Number(1)) {
                    						unitPromoId = -1;
                    					} else if (Number(result.newPromoRela[i]["unitPromoTag"]) == Number(2)) {
                    						if ($('#product_' + i).find(".project-plus-icon").length > 0) {
                    							unitPromoId = -101;
                    						}
                    					}
                    					param += "{skuId:" + i + ((result.newPromoRela[i]["multiPromoId"]) ? (",manPromoId:" + result.newPromoRela[i]["multiPromoId"]) : "") +
                    								(unitPromoId ? (",productPromoId:" + unitPromoId) : "") + "},";
                    				}
		                    	}
		                    	if (param.length > 0) {
		                    		param = param.substring(0, param.length-1);
		                    	}
		                    	me.opParam = "[" + param + "]";
		                    	$('.smart-guide-bottom').remove();
	                    		$("#cart-floatbar").prepend(
	                    			'<div class="promotion-best-bottom fixed-bottom hide" id="J_promotion_toast_cont">' +
	                    				'<div class="ac"><span class="bottom-continer">' +
                    						'<span class="info">已选商品有更优惠促销，修改后立省<em><b>￥</b>' + balance + '</em></span>' +
                    						'<span class="btn"><a href="#none" id="promoRelaButton">修改</a></span></span></div></div>' +
                    				'<div class="promotion-best-bottom fixed-bottom hide" id="J_promotion_toast">' +
	                    				'<div class="ac"><span class="bottom-toast" id="J_promotion_toast_click"><p>立省</p><p><em ' + (balance >= 100000 ? 'style="font-size:12px;"' : '') + '><b>￥</b>' + balance + '</em></p></span></div></div>');
	                    		if (me.firstOp) {
	                    			me.firstOp = false;
	                    			$("#J_promotion_toast_cont").removeClass("hide");
		                    		setTimeout(function(){$("#J_promotion_toast").removeClass("hide"),$("#J_promotion_toast_cont").addClass("hide")},5e3);
	                    		} else {
	                    			$("#J_promotion_toast").removeClass("hide");
	                    		}
	                    		var goalTop = $('#cart-floatbar').offset().top;
	                            var baseH = $(window).height();
	                            if(baseH + $(document).scrollTop() < goalTop) {
	                            	$('.promotion-best-bottom').addClass('fixed-bottom').css({bottom: '53px','background-color': 'inherit','box-shadow': 'none'});
	            				} else {
	            					$('.promotion-best-bottom').removeClass('fixed-bottom');
	            				}
	                            $(window).scroll(function() {
	                            	if($('.promotion-best-bottom').length < 1){
	                            		return ;
	                            	}
	                                if(baseH + $(document).scrollTop() < goalTop) {
	                                	$('.promotion-best-bottom').addClass('fixed-bottom').css({bottom: '53px','background-color': 'inherit','box-shadow': 'none'});
		            				} else {
		            					$('.promotion-best-bottom').removeClass('fixed-bottom');
		            				}
	                            });
		                        return;
	                    	}
	                    }
	                    me.opPromoShow = false;
		        		me.cartSmartFloatTips();
	                },
		            error : function(){
		                me.opPromoShow = false;
		                me.cartSmartFloatTips();
	                }
	            });
        	} catch(e){
        		me.opPromoShow = false;
        		me.cartSmartFloatTips();
        	}
        },
        
        showPreSellInfo:function(){
        	try{
        		var me = this;
        		// 取消所有定时任务
        		for(var j = 0,len=this.pSellEve.length; j < len; j++) {
        			window.clearInterval(this.pSellEve[j]);
        		}    			
        		this.pSellEve = [];
        		//预约
        		if(!me.preSellDowngrade()){
        			$('.booking-items.J_presell').each(function(i,o){
        				var status = $(o).attr('status');
        				if("1" == status){
        					$(o).html("待预约，预约开始时间" + $(o).attr('startTime').substring(0,$(o).attr('startTime').length-3));
        				}else if("2" == status){
        					var time = $(o).attr('panicbuyingStartTime');
        					if(time){
        						me.withIn24H(status,time,o);
        					}else{
        						$(o).html("预约中，开始抢购时间待定，敬请关注");
        					}
        				}else if("3" == status){
        					var time = $(o).attr('panicbuyingStartTime');
        					if(time){
        						me.withIn24H(status,time,o);
        					}else{
        						$(o).html("待抢购，开始抢购时间待定，敬请关注");
        					}
        				}else if("4" == status){
        					var time = $(o).attr('panicbuyingEndTime');
        					if(time){
        						me.withIn24H(status,time,o);
        					}
        				}
        			});
        		}
        		//闪购
        		if(!me.flashPurchaseDowngrade()){
        			$('.booking-items.J_flash').each(function(i,o){
        				var end = $(o).attr('endTime')/1000;
        				var currentTime = $('#currentTime').val()/1000;
        				if((end-currentTime)/3600 < 24 && currentTime <= end){
        					var call = function(){
        	        			try {
        		        			var leftSecond = parseInt(end - currentTime);// 换算成秒
        		        			if(leftSecond < 0){
        		        				me.updateCartInfo(me.iurl + '/jcart' , null , '获取购物车失败' , null);
        		        			}
        		    		        var hour = Math.floor(leftSecond % 86400 / 3600); // 倒计时小时
        		    		        var minute = Math.floor(leftSecond % 86400 % 3600 / 60); // 倒计时分
        		        			var second = leftSecond % 86400 % 3600 % 60; // 倒计时秒
        		        			var content = "【闪购】 还剩";
        		        			if(hour<10)
        		        				content += '<em>' + '0' + hour +'</em>:';
        		        			else
        		        				content += '<em>' + hour +'</em>:';
        		        			if(minute<10)
        		        				content += '<em>' + '0'  + minute +'</em>:';
        		        			else
        		        				content += '<em>' + minute +'</em>:';
        		        			if(second<10)
        		        				content += '<em>' + '0'  + second +'</em>';
        		        			else
        		        				content += '<em>' + second +'</em>';
        		        			$(o).html(content+"恢复原价");
        		        			currentTime = parseInt(currentTime) + 1;
        	        			} catch (e) {}
        	        		};
        	        		me.pSellEve.push(window.setInterval(call,1000));	
        				} else if (end) {
        					if(end>currentTime){
        						var content ="【闪购】"; 
        						content += me.formatDate($(o).attr('endTime')); 
        						$(o).html(content+" 恢复原价");
        					}
        	    		}
        			});
        		}
        	}catch(e){}
        },
        
        withIn24H:function(status,etime,obj) {
        	var me = this;
        	var currentTime = $('#currentTime').val()/1000;
        	var time = new Date(Date.parse(etime.replace(/-/g, "/"))).getTime()/1000;
        	if((time-currentTime)/3600 < 24 && currentTime <= time) {
        		var call = function(){
        			try {
	        			var leftSecond = parseInt(time - currentTime);// 换算成秒
	        			if(leftSecond < 0){
	        				me.updateCartInfo(me.iurl + '/jcart' , null , '获取购物车失败' , null);
	        			}
	    		        var hour = Math.floor(leftSecond % 86400 / 3600); // 倒计时小时
	    		        var minute = Math.floor(leftSecond % 86400 % 3600 / 60); // 倒计时分
	        			var second = leftSecond % 86400 % 3600 % 60; // 倒计时秒
	        			var content = "";
	        			if(status == "2"){
	        				content += "预约中，距离抢购开始还剩";
	        			}else if(status == "3"){
	        				content += "待抢购，距离抢购开始还剩";
	        			}else if(status == "4"){
	        				content += "抢购中，距离抢购结束还剩";
	        			}
	        			if(hour<10)
	        				content += '<em>' + '0' + hour +'</em>:';
	        			else
	        				content += '<em>' + hour +'</em>:';
	        			if(minute<10)
	        				content += '<em>' + '0'  + minute +'</em>:';
	        			else
	        				content += '<em>' + minute +'</em>:';
	        			if(second<10)
	        				content += '<em>' + '0'  + second +'</em>';
	        			else
	        				content += '<em>' + second +'</em>';
	        			$(obj).html(content);
	        			currentTime = parseInt(currentTime) + 1;
        			} catch (e) {}
        		};
        		me.pSellEve.push(window.setInterval(call,1000));
        	} else if (etime) {
        		var content =""; 
    			if(status == "2"){
    				content += "预约中，抢购开始时间";
    			}else if(status == "3"){
    				content += "待抢购，抢购开始时间";
    			}else if(status == "4"){
    				content += "抢购中，抢购结束时间";
    			}
    			etime = etime.substring(0,etime.length-3);
    			content += etime; 
    			$(obj).html(content);
    		}
        },
        
        formatDate:function(timeStamp){
    	    var date = new Date();
    	    date.setTime(timeStamp);
    	    var y = date.getFullYear();    
    	    var m = date.getMonth() + 1;    
    	    m = m < 10 ? ('0' + m) : m;    
    	    var d = date.getDate();    
    	    d = d < 10 ? ('0' + d) : d;    
    	    var h = date.getHours();  
    	    h = h < 10 ? ('0' + h) : h;  
    	    var minute = date.getMinutes();  
    	    minute = minute < 10 ? ('0' + minute) : minute;    
    	    return y + '-' + m + '-' + d+' '+h+':'+minute;    
        },
        
        initcarService:function(){
        	var serviceInfoIds="";
			var skuIdAndNums="";
        	$('.jdservice-items-popcar').each(function(){
        		serviceInfoIds +=$(this).attr('carSerId')+',';
				var pItem = $(this).parents(".item-item");
        		skuIdAndNums += pItem.attr("skuid") + "_" + pItem.attr("num") + ",";
        	});
        	if(serviceInfoIds != ""){
        		jQuery.ajax({
        			type : "POST",
        			dataType : "json",
        			url : this.iurl + '/getPopCarServiceInfo.action',
        			data : {"serviceInfoIds": serviceInfoIds, "skuIdAndNums": skuIdAndNums},
        			success : function(result) {
        				if(result && result.serviceProjectInfo){
        					$.each(result.serviceProjectInfo,function(i,o){
        						$('.service-item-popcar').show(); 
        						if(o.status == 1){
        							$('div[name=carService_' + o.serviceInfoId + ']').find('.service-name').html('【服务】'+(o.serviceProjectName==null?"":o.serviceProjectName));
        							if(o.serviceNumLink == 0) {
        								$('div[name=carService_' + o.serviceInfoId + ']').find('.num').html("X" + o.serviceNum);
        							}
        							$('div[name=carServiceShop_' + o.serviceInfoId + ']').find('.service-name').html('【门店】'+(o.locShopName==null?"":o.locShopName));
        						}else if(o.status == 0){
        							$('div[name=carService_' + o.serviceInfoId + ']').find('.service-name').html('【服务】已下线，请删除服务或到商品详情页重新选择');
        							if(o.serviceNumLink == 0) {
        								$('div[name=carService_' + o.serviceInfoId + ']').find('.num').html("X" + o.serviceNum);
        							}
        							$('div[name=carServiceShop_' + o.serviceInfoId + ']').remove();
        						}else  if(o.status == -1){
        							$('div[name=carService_' + o.serviceInfoId + ']').find('.service-name').html('【服务】'+(o.serviceProjectName==null?"":o.serviceProjectName));
        							if(o.serviceNumLink == 0) {
        								$('div[name=carService_' + o.serviceInfoId + ']').find('.num').html("X" + o.serviceNum);
        							}
        							$('div[name=carServiceShop_' + o.serviceInfoId + ']').find('.service-name').html('【门店】该门店已下线，请到商品详情页选择其他门店');
        						} 
        					});
        				}
        			},
        			error :function(){}
        		});
        	}
        	var me = this;
        	$('.cart-warp').delegate('.service-ops a.J_carService_del', 'click', function(){
               var pid = $(this).attr('sid');
               var cid = $(this).attr('cid');
               jQuery.ajax({
                   type : "POST",
                   dataType : "json",
                   url : '/removeCarService.action',
                   data : "pid=" + pid,
                   success : function(res) {
                       if(res && res.result){
                    	   if(res.result.success){
                    		   $('#'+pid+"_"+cid).remove();
                    	   }else{
                    		   me.showAlertDlg('删除失败');
                    	   }
                       }
                   },
                   error : function(){}
               });
           	});
        },
        
        initCarModelService:function(){
        	var me = this;
        	if(!me.carModelDowngrade()){
        		var cartModelInfoId = "";
        		$('[product]').each(function() {
        			if($(this).attr("cm")){
        				cartModelInfoId += $(this).attr("cm")+",";
        			}
        		});
        		$('[suit]').each(function() {
        			if($(this).attr("cm")){
        				cartModelInfoId += $(this).attr("cm")+",";
        			}
        		});
        		if(!cartModelInfoId){
        			return;
        		}
        		jQuery.ajax({
        			type : "POST",
        			dataType : "json",
        			url : this.iurl + '/getCarModelsInfo.action',
        			data: "cartModelInfoIds="+cartModelInfoId,
        			success : function(result) {
        				if (result && result.length > 0) {
        					var len = result.length;
        					for(var i = 0; i < len; i++){
        						var car = result[i];
        						var carIds = $('div[cm='+car.id+']');
        						var length = carIds.length;
        						for(var j = 0; j < length; j++){
        							var skuId = $(carIds[j]).attr('id');
        							var carm =$('div[id='+skuId+']').find('.p-props-new').find('[carmodel]');
        							if(carm.length == 0){
        								$('div[id='+skuId+']').find('.p-props-new').append('<div class="props-txt" carmodel title="'+car.seriesName+'">车型：'+(car.year?car.year:"")+(car.seriesName?car.seriesName:"")+'</div>')
        							}
        						}
        					}
        				}
        			}
        		});
        	}
        },
        
        // 初始化我的冰箱是否展示
        initfridge:function(){
           var me = this;
           	// 只有登录用户才处理
           if($("#isLogin").val() == 1){
               jQuery.ajax({
                   url: "//ifm.jd.com/fdcart/isFdUser",
                   dataType: 'jsonp',
                   success: function (result) {
                       // 请求是否成功
                       if(result.code == 0){
                           // 是否开启我的冰箱
                           if(result.open == 1){
                               // 显示我的冰箱
                	 			$("#fridge-a").show();
                           }else if(!$("#fridge-a").is(":hidden")){
                        	   $("#fridge-a").hide();
                           }
                       }
                   }
               })
           }
        },
        fridgeGuide: function(){
            // 引导cookie标示 00000 效果同sendpay (1)冰箱 (2)鞋柜 以此类推
            try {
                require.async('jdf/1.0.0/unit/cookie/1.0.0/cookie.js', function (cookie) {
                    $('#container,#fridge').delegate('i.cls', 'click', function (event) {
                        $('.fridge-guide-index,.fridge-guide-w').remove();
                        cookie('guide-flag', '10000' ,{expires:30});
                    });
                    var _cGuideFlag = cookie('guide-flag');
                    var guideFridge = false;
                    if (_cGuideFlag == null) {
                        guideFridge = true;
                    } else {
                        var _cGuideFlagArr = _cGuideFlag.split("");
                        if (_cGuideFlagArr[0] == 0) guideFridge = true; // 冰箱
                    }
                    if (guideFridge) {
                        var _guideTPL = '<div class="fridge-guide-index"><div class="ac pt20"><span>这位客官，购物车里的<strong>生鲜食物</strong>都在这里哟~<i class="cls"></i></span><span><a href="#fridge">还有更多为您精选的果蔬鱼肉，去看看&gt;</a></span></div></div>';
                        if ($('.cart-empty').length) {
                            _guideTPL = '<div class="fridge-guide-index"><div class="ac pt20"><span>这位客官，快往冰箱里添置点东西吧！<i class="cls"></i></span></div></div>';
                        }
                        $('#chunjie').closest('.w').before(_guideTPL);
                        var _guideTPL2 = '<div class="fridge-guide-w"><div class="fridge-guide-tit"><div class="ac"><span><i class="cls"></i></span></div></div></div>';
                        $('#fridge').find('.w:eq(0)').before(_guideTPL2);
                    }
                });
            }catch(err){}
        }
    };

    // 窗口加载成功后的展示
    // 页面进入加载购物车
    $(function(){
        // global(); // 切换到2.0版本初始化
        // if(isHK){
        // require.async("jdf/1.0.0/unit/globalInit/1.0.0/globalInit", function(global) {});
        // window.login = function(){
        // location.href = "//sso.jd360.hk/sso/login?ReturnUrl=" +
		// escape(location.href).replace(/\//g,"%2F");return false;
        // }
        // }else{
        require.async("jdf/1.0.0/unit/globalInit/5.0.0/globalInit", function(global) {
            global();
        });
        // }
        $("body").lazyload({type: "img",source: "data-lazy-img"});
        $("#app-jd").hover(function() {
            $(this).addClass("hover").append('<div class="dd lh"><div class="qr-info"></div></div>')
        }, function() {
            $(this).removeClass("hover").find('.dd.lh').remove();
        });
        if(typeof showUpBrowserTips == 'function'){
        	showUpBrowserTips();
        }
        cartObj.initSearchUnit();
        if($('.login-btn').length){
            // 登陆
            $('body').delegate('a.login-btn', 'click', function(){
                cartObj.goToLogin();
            });
        } else if($('#cart-list').length){
        	// 绑定商品中功能按键的事件
        	cartObj.init();
        }
        // 推荐位 鼠标滚动到下方时展开。
        cartObj.initRecommendAndCollection();
        
        // 初始化购物车侧边栏
        // 我的冰箱屏蔽侧边栏
        if(cartObj.t != cartObj.myfridge){
        	cartObj.initCartSidebar();
            // 我的冰箱
//            if($("#hidebx").val() == 0){
//             	cartObj.initfridge();
//            }
            if($('#cart-list').length){
            	cartObj.initCartSmart();
            }
            if (cartObj.ssgDowngrade()) {
            	cartObj.removeSsg();
            }
        }else{
            if($('.cart-empty').length){
                cartObj.initArea();
            }
            // 新手引导
            cartObj.fridgeGuide();

        	var jsPath = "//misc.360buyimg.com/user/cart/fridge/1.0.0/";
        	if($("#isMiscdg").val() == 1 ){
        		jsPath = "//cart.jd.com/misc/user/cart/fridge/1.0.0/";
        	}
        	require.async([jsPath+'js/fridge-rebuy',jsPath+'js/fridge-menus',jsPath+'js/fridge-season'],function(rebuy,menus,season){
                // 冰箱复购、菜单、时令楼层加载
                rebuy.fridgeReBuy(function(){menus.fridgeMenus(function(){season.fridgeSeason(function(){});});});
        	});
        	$('body').delegate('#fridge .btn-append', 'click', function(){
                var $el = $(this);
                cartObj.jGate($el.attr('_pid'), 1, 1, 0, 0, function(){
                    $el.parent().after('<div class="addcart-succ-tips"><i></i><span>成功加入冰箱</span></div>');
                    setTimeout(function(){ $('.addcart-succ-tips').remove();}, 2000);
                });
            });
        }

        // 返回顶部
        $('#bp-backtop').gotop({
            hasAnimate: true
        });
        // 春节公告
        try{
            require.async('//nfa.jd.com/loadFa.js?aid=0_0_7555',function(chunjieAd){
                chunjieAd && chunjieAd.show('chunjie');
            });
        }catch(err){};
		// 常买icon tips
	    $('.frequent-ico').tips({
	      hasClose: false,
	      type: 'hover',
	      width: 388,
	      align: ['top', 'right'],
	      tipsClass: 'frequent-tips',
	      zIndex: 10000,
	      callback: function(trigger, obj) {
	        $(obj).offset({left:$(obj).offset().left+5});
	      }
	    });
    });
});
