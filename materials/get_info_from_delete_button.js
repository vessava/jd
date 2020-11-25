// https://cart.jd.com/js/cart.new.js?v=201801162217

// line 1323 method updateProductInfo
// line 291
// line 4825 method toggleSingleSelect

var me = this;
$(".cart-warp").delegate("input[name=checkItem]", "click", function () {
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

  if (arr.length == 3) {
    targetId = arr[2];
  }

  if (me.checkSku(pid)) {
    // 是否勾选商品
    var cb = mEl.prop("checked");
    var act = cb ? "selectItem" : "cancelItem";
    var tip = cb
      ? "勾选商品失败，请刷新页面重试。"
      : "取消商品失败，请刷新页面重试。";

    var outSkus = me.outSkus;
    var venderId = mEl.parents(".cart-tbody").attr("id");
    venderId = venderId.substring(venderId.lastIndexOf("_") + 1);
    var params =
      "&pid=" +
      escape(pid) +
      "&ptype=" +
      escape(ptype) +
      "&skuUuid=" +
      escape(skuUuid) +
      (handtailor == "true" ? "&useUuid=true" : "") +
      "&packId=0" +
      "&targetId=" +
      escape(targetId) +
      "&promoID=" +
      escape(targetId) +
      "&venderId=" +
      venderId +
      "&t=" +
      me.t +
      "&manFanZeng=1";

    if (manFanZeng == "1" || ptype == "4") {
      var venderId = mEl.parents(".cart-tbody").attr("id");
      venderId = venderId.substring(venderId.lastIndexOf("_") + 1);
      var params =
        "&pid=" +
        escape(pid) +
        "&ptype=" +
        escape(ptype) +
        "&skuUuid=" +
        escape(skuUuid) +
        (handtailor == "true" ? "&useUuid=true" : "") +
        "&packId=0" +
        "&targetId=" +
        escape(targetId) +
        "&promoID=" +
        escape(targetId) +
        "&venderId=" +
        venderId +
        "&t=" +
        me.t +
        "&manFanZeng=1";

      me.updateVenderInfo(me.iurl + "/" + act + ".action", params, tip);
    } else {
      var venderId = mEl.parents(".cart-tbody").attr("id");
      venderId = venderId.substring(venderId.lastIndexOf("_") + 1);
      var params =
        "&outSkus=" +
        outSkus +
        "&pid=" +
        escape(pid) +
        "&ptype=" +
        escape(ptype) +
        "&skuUuid=" +
        escape(skuUuid) +
        (handtailor == "true" ? "&useUuid=true" : "") +
        "&packId=0" +
        "&targetId=" +
        escape(targetId) +
        "&promoID=" +
        escape(targetId) +
        "&venderId=" +
        venderId +
        "&t=" +
        me.t;
      me.updateProductInfo(
        me.iurl + "/" + act + ".action?rd" + Math.random(),
        params,
        tip,
        function (result) {
          me.toggleVenderCheckbox(cb, mEl);
        }
      );
    }
  }
});
