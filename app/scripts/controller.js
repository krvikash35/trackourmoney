'use strict'

var tmmController = angular.module('tmmController', []);
//****************************************************************************
// Main controller for handling landing page and controlling navigation item
//**************************************************************************
tmmController.controller('mainController', function($timeout, $interval, utilSer, valSer, $localStorage, $route,$rootScope, $scope,$location, $http, $window){


  $scope.isLoginFormVisible=true;
  $scope.isRegFormVisible=false;
  //***************************************
  //toggling Login and Registration View
  //**************************************
  $scope.toggleLoginAndRegView=function(){
    $scope.isLoginFormVisible=!$scope.isLoginFormVisible;
    $scope.isRegFormVisible=!$scope.isRegFormVisible;
  };

  //***************************************
  //Controlling Slideshow on feed view
  //**************************************
  utilSer.initSlide($scope);

  //**************************************
  //Processing user loginForm
  //**************************************
  $scope.submitLoginForm = function(loginForm){
    $http.post('/signin', loginForm)
    .success(function(data, status, headers, config){
      $localStorage.token = data;
      $localStorage.userId= (headers('location').split("/"))[1];

      $scope.$emit('eventLoggedIn', true);
      $location.path(headers('location'));
    })
    .error(function(data, status, headers, config){
      //$scope.authResMsg="Wrong password!"
      utilSer.showFlashMsg($scope, "error", 'authResMsg', data, true);
    })
  }
  //***************************************
  //Processing user forgot password
  //***************************************
  $scope.sendPwdToEmail = function(regEmail){
    $scope.resAwaiting=true;
    $http.post('/forgotPwd', {email: regEmail})
    .success(function(data){
      utilSer.showFlashMsg($scope, "success", 'authResMsg', data, false);
      $scope.showForgotPwd=false;
      $scope.resAwaiting=false;
    })
    .error(function(data){
      utilSer.showFlashMsg($scope, "error", 'authResMsg', data, true);
      $scope.resAwaiting=false;
    })
  }
  //***************************************
  //Processing user regestration form
  //***************************************
  var promisEmailVerProg=null;
  var startEmailVerProg = function(initVal, max, noOfTime, interInMilli){
    $scope.currentVal=initVal;
    $scope.max=max;
    promisEmailVerProg=$interval(function(){
      $scope.currentVal=$scope.currentVal+max/noOfTime;
      if($scope.currentVal == max){
        utilSer.showFlashMsg($scope, "success", 'authResMsg', "Sometime email sending takes time, check your email, if you got, enter it here and dont refresh the page or wait for the response");
        $scope.isVerCodeSent = true;
        $scope.emailVerButton = "Verify Code"
        $scope.verCodeSentInProgress=false;
        $interval.cancel(promisEmailVerProg)
      }
    }, interInMilli, noOfTime)
  }



  $scope.verifyEmail = function verifyEmail(regForm) {
    var err;
    if ( err=valSer.valEmail(regForm.email) )
    return utilSer.showFlashMsg($scope, "error", 'authResMsg', err, true);
    if($scope.isVerCodeSent){
      $http.post('/signup', {signupCode: "2", email: regForm.email, verCode: regForm.verCode})
      .success(function(data, status, headers, config){
        utilSer.showFlashMsg($scope, "success", 'authResMsg', data, true);
        $scope.isEmailVerified = true;
        $scope.emailVerButton = "Verified"
      })
      .error(function(data, status, headers, config){
        utilSer.showFlashMsg($scope, "error", 'authResMsg', data, true);
      });
    }else {
      $scope.verCodeSentInProgress=true;
      startEmailVerProg(0, 100, 20, 500 );
      $http.post('/signup', {signupCode: "1", email: regForm.email})
      .success(function(data, status, headers, config){
        utilSer.showFlashMsg($scope, "success", 'authResMsg', data, false);
        $scope.isVerCodeSent = true;
        $scope.emailVerButton = "Verify Code"
        $scope.verCodeSentInProgress=false;
        $interval.cancel(promisEmailVerProg)
      })
      .error(function(data, status, headers, config){
        utilSer.showFlashMsg($scope, "error", 'authResMsg', data, false);
        $scope.isVerCodeSent = false;
        $scope.verCodeSentInProgress=false;
        $interval.cancel(promisEmailVerProg)
      });
    }
  }

  $scope.submitRegForm = function(regForm){
    if(regForm.password !== regForm.password1){
      return utilSer.showFlashMsg($scope, "error", 'authResMsg', "password did not match", true);
    }
    regForm.signupCode="3";
    $http.post('/signup', regForm)
    .success(function(data, status, headers, config){
      $localStorage.token = data;
      $localStorage.userId= (headers('location').split("/"))[1];
      $scope.$emit('eventLoggedIn', true);
      $location.path(headers('location'));
    })
    .error(function(data, status, headers, config){
      utilSer.showFlashMsg($scope, "error", 'authResMsg', data, true);
    });

  };

});


















//*******************************************************************************
//Controller for handing updating and viewing user related info including templete
//********************************************************************************
tmmController.controller('userInfoController', function($routeParams, valSer, utilSer, $localStorage, $filter, $q, $scope, $rootScope, $location, $http,  $window){
  //******************************************
  //Intializing and populating user Info view
  //******************************************
  $http.get("/user/"+$routeParams.userId+"/info")
  .success(function(data, status, headers, config){

    userInfoInit(data);
  })
  .error(function(data, status, headers, config){
    return utilSer.showFlashMsg($scope, "error", 'usrBasicInfoUpdateResp', data, true);
  })
  var userInfoInit = function(userInfo){
    $scope.userBasicInfo=userInfo.account;
    var eSrc=userInfo.sourceOfMoneyTrx.expenseSource;
    var iSrc=userInfo.sourceOfMoneyTrx.incomeSource;
    $scope.expenseSource=[];
    $scope.incomeSource=[];
    $scope.userMoneyAccount=userInfo.moneyAccount;
    for(var i=$scope.userMoneyAccount.length; i--;){
      $scope.userMoneyAccount[i].id=i;
    }
    for(var i=userInfo.sourceOfMoneyTrx.expenseSource.length; i--;){
      $scope.expenseSource.push({id:i, name:eSrc[i]})
    }
    for(var i=userInfo.sourceOfMoneyTrx.incomeSource.length; i--;){
      $scope.incomeSource.push({id:i, name:iSrc[i]})
    }
  }

  $scope.moneyAccountType=["SavingAccount", "CreditCard","DigitalWallet","CashAccount"];
  //***************************************
  //updating Full Name
  //**************************************
  $scope.updateFullName = function(fullName){
    var err;
    if( err=valSer.valName(fullName) ){
      utilSer.showFlashMsg($scope, "error", 'usrBasicInfoUpdateResp', err, true);
      return ""
    }
    return $http.put($location.path(), {updatecode: "7", updateitem: fullName})
    .success(function(data, status, headers, config){
      utilSer.showFlashMsg($scope, "success", 'usrBasicInfoUpdateResp', data, true);
    })
    .error(function(data, status, headers, config){
      utilSer.showFlashMsg($scope, "error", 'usrBasicInfoUpdateResp', data, true);
    })
  }
  //***************************************
  //Updating Password
  //**************************************
  $scope.updatePassword = function(password){
    var err;
    if( err=valSer.valPwd(password) ){
      utilSer.showFlashMsg($scope, "error", 'usrBasicInfoUpdateResp', err, true);
      return ""
    }

    return $http.put($location.path(), {updatecode: "4", updateitem: password})
    .success(function(data, status, headers, config){
      utilSer.showFlashMsg($scope, "success", 'usrBasicInfoUpdateResp', data, true);
    })
    .error(function(data, status, headers, config){
      utilSer.showFlashMsg($scope, "error", 'usrBasicInfoUpdateResp', data, true);
    })
  }
  //***********************************************************
  // Updating User Money Account
  //***********************************************************
  $scope.valMAType = function valMAType(maType){
    var err;
    if( err=valSer.valMAType(maType) ){
      utilSer.showFlashMsg($scope, "error", 'usrMoneyAcctUpdateResp',err , true);
      return "";
    }
  }
  $scope.valMAName = function valMAName(maName){
    var err;
    if( err=valSer.valMAName(maName) ){
      utilSer.showFlashMsg($scope, "error", 'usrMoneyAcctUpdateResp',err , true);
      return "";
    }
  }

  $scope.updateMoneyAccount = function(){
    var result = [];
    var err;
    for(var i=0; i<$scope.userMoneyAccount.length; i++){
      if(!$scope.userMoneyAccount[i].isDeleted){
        result.push($scope.userMoneyAccount[i])
      }
    }
    if(err=valSer.valMAcct(result)){
      utilSer.showFlashMsg($scope, "error", 'usrMoneyAcctUpdateResp', err, true);
      return ""
    }
    // for(var i = $scope.userMoneyAccount.length; i--;){
    //   var ma = $scope.userMoneyAccount[i];
    //   // if(ma.isDeleted){
    //   //   $scope.userMoneyAccount.splice(i,1);
    //   // }
    //   // if(ma.isNew){
    //   //   ma.isNew = false;
    //   // }
    //   // result.push(ma);
    // }
    return $http.put($location.path(), {updatecode: "3", updateitem: result})
    .success(function(data, status, headers, config){
      utilSer.showFlashMsg($scope, "success", 'usrMoneyAcctUpdateResp', data, true);
    })
    .error(function(data, status, headers, config){
      utilSer.showFlashMsg($scope, "error", 'usrMoneyAcctUpdateResp', data, true);
    })
  }


  $scope.addMoneyAccountRow = function(){
    $scope.userMoneyAccount.push({
      id: $scope.userMoneyAccount.length+1,
      type: "SavingAccount",
      name: "",
      isNew: true
    });
  };
  $scope.filterMoneyAccountRow = function(ma){
    return ma.isDeleted != true;
  }
  $scope.deleteMoneyAccountRow = function(id){
    var filtered = $filter('filter')($scope.userMoneyAccount, {id: id});
    if (filtered.length) {
      filtered[0].isDeleted = true;
    }
  }
  $scope.cancelMoneyAccountUpdate = function(){
    for (var i = $scope.userMoneyAccount.length; i--;) {
      var ma = $scope.userMoneyAccount[i];
      if (ma.isDeleted) {
        delete ma.isDeleted;
      }
      if (ma.isNew) {
        $scope.userMoneyAccount.splice(i, 1);
      }
    };
  };
  //***********************************************************
  // Updating User Expense Source
  //***********************************************************
  $scope.updateExpenseSource = function(){
    var result = [];
    var err;
    for(var i=0; i<$scope.expenseSource.length; i++){
      if(!$scope.expenseSource[i].isDeleted){
        result.push($scope.expenseSource[i].name)
      }
    }
    if( err=valSer.valExpSrc(result) ){
      utilSer.showFlashMsg($scope, "error", 'usrExpSrcUpdateResp', err, true);
      return ""
    }

    //
    // var result = [];
    // for(var i = $scope.expenseSource.length; i--;){
    //   var es = $scope.expenseSource[i];
    //   if(es.isDeleted){
    //     $scope.expenseSource.splice(i,1);
    //   }
    //   if(es.isNew){
    //     es.isNew = false;
    //   }
    // }
    // for(var i=$scope.expenseSource.length; i--;){
    //   result[i]=$scope.expenseSource[i].name;
    // }


    return $http.put($location.path(), {updatecode: "1", updateitem: result})
    .success(function(data, status, headers, config){
      utilSer.showFlashMsg($scope, "success", 'usrExpSrcUpdateResp', data, true);
    })
    .error(function(data, status, headers, config){
      utilSer.showFlashMsg($scope, "error", 'usrExpSrcUpdateResp', data, true);
    })
  }
  $scope.addExpenseSourceRow = function(){
    $scope.expenseSource.push({
      id: $scope.expenseSource.length+1,
      name: "",
      isNew: true
    });
  };
  $scope.filterExpenseAccountRow = function(es){
    return es.isDeleted != true;
  }
  $scope.deleteExpenseSourceRow = function(id){
    var filtered = $filter('filter')($scope.expenseSource, {id: id});
    if (filtered.length) {
      filtered[0].isDeleted = true;
    }
  }
  $scope.cancelExpenseSourceUpdate = function(){
    for (var i = $scope.expenseSource.length; i--;) {
      var es = $scope.expenseSource[i];
      if (es.isDeleted) {
        delete es.isDeleted;
      }
      if (es.isNew) {
        $scope.expenseSource.splice(i, 1);
      }
    };
  };
  //***********************************************************
  // Updating User Income Source
  //***********************************************************
  $scope.updateIncomeSource = function(){

    var result = [];
    var err;
    for(var i=0; i<$scope.incomeSource.length; i++){
      if(!$scope.incomeSource[i].isDeleted){
        result.push($scope.incomeSource[i].name)
      }
    }
    if( err=valSer.valIncSrc(result) ){
      utilSer.showFlashMsg($scope, "error", 'usrIncSrcUpdateResp', err, true);
      return ""
    }

    // var result = [];
    // for(var i = $scope.incomeSource.length; i--;){
    //   var is = $scope.incomeSource[i];
    //   if(is.isDeleted){
    //     $scope.incomeSource.splice(i,1);
    //   }
    //   if(is.isNew){
    //     is.isNew = false;
    //   }
    // }
    // for(var i=$scope.incomeSource.length; i--;){
    //   result[i]=$scope.incomeSource[i].name;
    // }
    return $http.put($location.path(), {updatecode: "2", updateitem: result})
    .success(function(data, status, headers, config){
      utilSer.showFlashMsg($scope, "success", 'usrIncSrcUpdateResp', data, true);
    })
    .error(function(data, status, headers, config){
      utilSer.showFlashMsg($scope, "error", 'usrIncSrcUpdateResp', data, true);
    })
  }
  $scope.addIncomeSourceRow = function abc(){
    $scope.incomeSource.push({
      id: $scope.incomeSource.length+1,
      name: "",
      isNew: true
    });
  };
  $scope.filterIncomeSourceRow = function(is){
    return is.isDeleted != true;
  }
  $scope.deleteIncomeSourceRow = function(id){
    var filtered = $filter('filter')($scope.incomeSource, {id: id});
    if (filtered.length) {
      filtered[0].isDeleted = true;
    }
  }
  $scope.cancelIncomeSourceUpdate = function(){
    for (var i = $scope.incomeSource.length; i--;) {
      var is = $scope.incomeSource[i];
      if (is.isDeleted) {
        delete is.isDeleted;
      }
      if (is.isNew) {
        $scope.incomeSource.splice(i, 1);
      }
    };
  };


});













































































//**************************************************************************************
// Controller for handling user transaction
//**************************************************************************************
tmmController.controller('userTrxController', function(valSer,utilSer, $localStorage, $scope, $routeParams, $rootScope, $location, $http,  $window){
  $scope.trx={};
  var usrIncomeSrc=[];
  var usrExpenseSrc=[];
  var usrMoneyAcct=[];
  var trxUiInit=function(user){
    usrIncomeSrc=user.sourceOfMoneyTrx.incomeSource;
    usrExpenseSrc=user.sourceOfMoneyTrx.expenseSource;
    user.moneyAccount.forEach(function(ma){
      usrMoneyAcct.push(ma.type+"-"+ma.name);
    });
    trxUiHandler();
  }
  var trxUiHandler=function(trxType){
    if(trxType === undefined || trxType === null){
      trxType = 'Expense';
    }
    switch (trxType) {
      case 'Income':
      $scope.trxSource=usrIncomeSrc;
      $scope.trxDestination=usrMoneyAcct;
      $scope.trx.source=usrIncomeSrc[0];
      $scope.trx.destination=usrMoneyAcct[0];
      break;
      case 'Transfer':
      $scope.trxSource=usrMoneyAcct;
      $scope.trxDestination=usrMoneyAcct;
      $scope.trx.source=usrMoneyAcct[0];
      $scope.trx.destination=usrMoneyAcct[0];
      break;
      default: //Expense
      $scope.trxSource=usrExpenseSrc;
      $scope.trxDestination=usrMoneyAcct;
      $scope.trx.source=usrExpenseSrc[0];
      $scope.trx.destination=usrMoneyAcct[0];
    }
  }
  $http.get("/user/"+$routeParams.userId+"/info")
  .success(function(data, status, headers, config){
    $localStorage.email=data.account.email;
    trxUiInit(data);
  })
  .error(function(data, status, headers, config){
    utilSer.showFlashMsg($scope, "error", 'prsTrxResp', data, true);
  });


  $scope.submitTrxForm=function(trxForm){
    var err;
    if(err=valSer.valAmount(trxForm.amount)){
      utilSer.showFlashMsg($scope, "error", 'prsTrxResp', err, true);
      return err;
    }
    $scope.isPrsTrxResInProg=true;
    $http.post("/user/"+$routeParams.userId+"/trx", trxForm)
    .success(function(data, status, headers, config){
      utilSer.showFlashMsg($scope, "success", 'prsTrxResp', data, true);
      $scope.isPrsTrxResInProg=false;
      $scope.trx.amount=null
    })
    .error(function(data, status, headers, config){
      utilSer.showFlashMsg($scope, "error", 'prsTrxResp', data, true);
    })


  }
  $scope.initTrxDate = function() {
    $scope.trx.date = new Date();
  };
  $scope.trxTypeChanged = function(trxType){
    trxUiHandler(trxType);
  }


  $scope.grTrx={};
  var getUserGroup = function(){
    $http.get("/user/"+$localStorage.userId+"/group")
    .success(function(data, status, headers, config){
      $scope.grTrx.group=data[0];
      $scope.userGroup=data;
      $scope.userEmail=$localStorage.email;
    })
    .error(function(data, status, headers, config){
      return utilSer.showFlashMsg($scope, "error", 'prsTrxResp', data, true);
    })
  }
  getUserGroup();
  $scope.submitGrpTrxForm = function(grpTrx){
    var gtMem=[];
    for(var i=grpTrx.group.grMember.length; i--;){
      gtMem.push({"gtMemAmount": grpTrx[grpTrx.group.grMember[i].grMemEmail], "gtMemEmail": grpTrx.group.grMember[i].grMemEmail})
    }
    var grTrx={"grId":grpTrx.group._id, "gtAmount":grpTrx.amount, "gtMem": gtMem, "gtDate": grpTrx.date, "gtDesc": grpTrx.desc, "gtItem": grpTrx.grTemplate};
    $scope.isGrpTrxResInProg=true;
    grpTrx.amount=null
    $http.post("/user/"+$routeParams.userId+"/group/trx", grTrx)
    .success(function(data, status, headers, config){
      utilSer.showFlashMsg($scope, "success", 'grpTrxResp', data, true);
      $scope.isGrpTrxResInProg=false;
    })
    .error(function(data, status, headers, config){
      utilSer.showFlashMsg($scope, "error", 'grpTrxResp', data, true);
    })

  }

  $scope.initGrTrxDate = function(){
    $scope.grTrx.date = new Date()
  }

  $scope.initEqualAmount = function(grMem){
    for(var i=grMem.length; i--;){
      $scope.grTrx[grMem[i].grMemEmail]=$scope.grTrx.amount/grMem.length
    }
  }

})








//************************************************************************************
//Controller for handling user transaction report
//***********************************************************************************
tmmController.controller('userReportController', function( $routeParams, $filter, valSer, utilSer, $localStorage, $scope, $rootScope, $location, $http,  $window){
  // $http.get($location.path())
  $scope.toggleGrDelBtn=false;
  $scope.userEmail=$localStorage.email;
  $http.get("/user/"+$routeParams.userId+"/trx")
  .success(function(data, status, headers, config){
    $scope.userTrxReport=data;
  })
  .error(function(data, status, headers, config){
    utilSer.showFlashMsg($scope, "error", 'usrReportResp', data, true);
  })
  $scope.calTotalAmount = function(filterdTrx){
    var totalAmount=0
    if(filterdTrx && filterdTrx.length>0){
      for(var i=filterdTrx.length;i--;){
        totalAmount=totalAmount+filterdTrx[i].amount
      }
      return totalAmount;
    }else {
      return totalAmount;
    }

  }
  $scope.today = function() {
    $scope.toDate = new Date();
    $scope.fromDate = new Date();
    $scope.fromDate.setDate($scope.toDate.getDate()-120)
  };
  $scope.today();
  $scope.status = {
    opened: false
  };
  $scope.showFromDatePicker = function($event) {
    $scope.status.opened = true;
  };
  $scope.showToDatePicker = function($event) {
    $scope.status.opened = true;
  };
  $scope.ValDate = function(){
    var err;
    if (err=valSer.valDateForReport($scope.fromDate, $scope.toDate)){
      utilSer.showFlashMsg($scope, "error", 'usrReportResp', err, true);

    }
  }

  $scope.deletePrsTrx = function(trxId){
    $http.delete("/user/"+$routeParams.userId+"/trx/"+trxId)
    .success(function(data, status){
      $scope.userTrxReport=$filter('filter')($scope.userTrxReport, {$: '!'+trxId})
      utilSer.showFlashMsg($scope, "success", 'usrReportResp', data, true);
    })
    .error(function(data, status){
      utilSer.showFlashMsg($scope, "error", 'usrReportResp', data, true);
    })
  }



  $scope.grReport={};
  var getUserGroup = function(){
    $http.get("/user/"+$localStorage.userId+"/group")
    .success(function(data, status, headers, config){
      $scope.grReport.group=data[0];
      $scope.userGroup=data;
    })
    .error(function(data, status, headers, config){
      return utilSer.showFlashMsg($scope, "error", 'usrGrpReportResp', data, true);
    })
  }

  getUserGroup();


  var getGroupTrx = function(){
    $http.get("/user/"+$localStorage.userId+"/group/trx")
    .success(function(data, status, headers, config){
      $scope.userGrpReport=data;
    })
    .error(function(data, status, headers, config){
      return utilSer.showFlashMsg($scope, "error", 'usrGrpReportResp', data, true);
    })
  }
  getGroupTrx()

  $scope.deleteGrTrx = function(grpTrxId, g){
    $http.delete("/user/"+$localStorage.userId+"/group/trx/"+grpTrxId)
    .success(function(data, scope){
      utilSer.showFlashMsg($scope, "success", 'usrGrpReportResp', data, true);
      g.isDeleted=true;
    })
    .error(function(data, scope){
      utilSer.showFlashMsg($scope, "error", 'usrGrpReportResp', data, true);
    })
  }

  $scope.finalGrpBalance = function(data){
    if(data && data.length!=0){
      var grMem=data[0].gtMem;
      var result={}
      for(var i=grMem.length;i--;){
        var newO={}
        for(var j=grMem.length;j--;){
          newO[grMem[j].gtMemEmail]=0
        }
        result[grMem[i].gtMemEmail]= newO
      }
      for(var i=data.length;i--;){
        for(var j=data[i].gtMem.length;j--;){
          result[data[i].gtInitiator][data[i].gtMem[j].gtMemEmail]=data[i].gtMem[j].gtMemAmount+result[data[i].gtInitiator][data[i].gtMem[j].gtMemEmail]
        }
      }
      $scope.finalBalance=result;
    }else {
      return $scope.finalBalance=null;
    }
  }


})


tmmController.controller('ModalInstanceCtrl', function($scope, $uibModalInstance){
  $scope.closeModal = function(){
    $uibModalInstance.dismiss();
  }
})
//************************************************************************************
//Navigation controller
//************************************************************************************
tmmController.controller('naviCtrl', function($http, $uibModal, utilSer, $interval, $scope, $rootScope, $location, $localStorage){
  //***************************************
  //Logout function redirecteding to home
  //**************************************

$scope.themeElementId="L"
  var applyTheme = function(){
    if($localStorage.colorPref){
      document.getElementById('stylesheet').href='style/light.css';
      $scope.themeElementId="D"
      $scope.navbarTheme="navbar-default"
    }else {
      document.getElementById('stylesheet').href='style/dark.css';
      $scope.themeElementId="L"
      $scope.navbarTheme="navbar-inverse"
    }
  }
  applyTheme();
  $scope.toggleTheme= function(){
    $localStorage.colorPref=!$localStorage.colorPref
    applyTheme();
  }
  $scope.deleteNoti = function(updateTypeCode){
    if($scope.userNoti.length==0)
    return 0
    $http.put("/user/"+$localStorage.userId+"/notification", {"updateTypeCode": updateTypeCode})
    .success(function(data, status){
      utilSer.showFlashMsg($scope, "success", 'grAcctResp', data, true);
      $scope.getUserNoti();
    })
    .error(function(data, status){
      utilSer.showFlashMsg($scope, "error", 'grAcctResp', data, true);
    })
  }

  $scope.markNotiAsRead = function(nId){
    $http.put("/user/"+$localStorage.userId+"/notification", {"updateTypeCode": "1", "notificationId": nId})
    .success(function(data, status){
      utilSer.showFlashMsg($scope, "success", 'grAcctResp', data, true);
      $scope.getUserNoti()
    })
    .error(function(data, status){
      utilSer.showFlashMsg($scope, "error", 'grAcctResp', data, true);
    })
  }


  $scope.getUserNoti = function(){
    $http.get("/user/"+$localStorage.userId+"/notification")
    .success(function(data, status, headers, config){
      $scope.userNoti=data;
    })
    .error(function(data, status, headers, config){
      return utilSer.showFlashMsg($scope, "error", 'usrBasicInfoUpdateResp', data, true);
    })
  }

  $scope.accetAddToGroupInvite = function(nId){
    $http.put("/user/"+$localStorage.userId+"/group", {"updateTypeCode": "2", "notificationId": nId})
    .success(function(data, status){
      console.log(data);
      utilSer.showFlashMsg($scope, "success", 'grAcctResp', data, true);
      $scope.getUserNoti()
    })
    .error(function(data, status){
      utilSer.showFlashMsg($scope, "error", 'grAcctResp', data, true);
    })
  }
  $scope.noti = {
    templateUrl: 'noti.html',
  };
  if($localStorage.token){
    $scope.isLogged=true;
    $scope.userId=$localStorage.userId;
  }
  $scope.$on('eventLoggedIn', function (event, args) {
    $scope.isLogged=args;
    $scope.userId=$localStorage.userId;
  })
  $rootScope.$on('eventLoggedOut', function (event, args) {
    $scope.logout();
  })
  $scope.logout = function(){
    delete $localStorage.token;
    delete $localStorage.userId;
    delete $localStorage.email;
    $scope.userId=null;
    $scope.isLogged = false;
    $location.path('/main');
  };
  $scope.openAbout = function(size){
    $uibModal.open({
      templateUrl: 'partials/about.html',
      controller: 'ModalInstanceCtrl',
      size: size
    });
  }
  $scope.openPrivacy = function(size){
    $uibModal.open({
      templateUrl: 'partials/privacy.html',
      controller: 'ModalInstanceCtrl',
      size: size
    });
  }
  $scope.openTC = function(size){
    $uibModal.open({
      templateUrl: 'partials/termcondition.html',
      controller: 'ModalInstanceCtrl',
      size: size
    });
  }

  $rootScope.$on('serverError', function (event, errRes) {
    $scope.serErrMsg=errRes
  })

})

//************************************************************************************
//ErrorPage controller
//*************************************************************************************
tmmController.controller("errorCtrl", function($scope, $rootScope){

})


//*****************************************************************
//groupController
//***************************************************************
tmmController.controller("groupController", function($timeout, $interval, utilSer, valSer, $localStorage, $route,$rootScope, $scope,$location, $http, $window){


  var getUserGroup = function(){
    $http.get("/user/"+$localStorage.userId+"/group")
    .success(function(data, status, headers, config){
      $scope.userGroup=data;
      $scope.userEmail=$localStorage.email;
    })
    .error(function(data, status, headers, config){
      return utilSer.showFlashMsg($scope, "error", 'usrBasicInfoUpdateResp', data, true);
    })
  }

  getUserGroup();

  var toggle=true;
  $scope.isAdminGroup  = function(a){
    a.isAdmin=toggle
    toggle=!toggle;
  }

  $scope.deleteGrMem = function(m, grId, grMemEmail){
    $http.put("/user/"+$localStorage.userId+"/group", {"updateTypeCode": "3", "grMemEmail": grMemEmail, "groupId": grId})
    .success(function(data, status){
      utilSer.showFlashMsg($scope, "success", 'grAcctResp', data, true);
      m.isDeleted=true;
    })
    .error(function(data, status){
      utilSer.showFlashMsg($scope, "error", 'grAcctResp', data, true);
    })
  }

  $scope.sendInviteForAddtoGroup = function(m, grId, grMemEmail){
    m.inProgress=true;
    $http.put("/user/"+$localStorage.userId+"/group", {"updateTypeCode": "1", "groupId":grId, "inviteeEmail": grMemEmail})
    .success(function(data, status){
      utilSer.showFlashMsg($scope, "success", 'grAcctResp', data, true);
      m.inviteeEmail=""
      m.inProgress=false;
    })
    .error(function(data, status){
      utilSer.showFlashMsg($scope, "error", 'grAcctResp', data, true);
      m.inviteeEmail=""
      m.inProgress=false;
    })
  }

  $scope.createNewGroup = function(grName){
    $http.post("/user/"+$localStorage.userId+"/group", {"grName": grName})
    .success(function(data, scope){
      utilSer.showFlashMsg($scope, "success", 'grAcctResp', data, true);
      getUserGroup();
    })
    .error(function(data, scope){
      utilSer.showFlashMsg($scope, "error", 'grAcctResp', data, true);
    })
  }

  $scope.deleteGroup = function(grId){
    $http.delete("/user/"+$localStorage.userId+"/group/"+grId)
    .success(function(data, scope){
      utilSer.showFlashMsg($scope, "success", 'grAcctResp', data, true);
      getUserGroup();

    })
    .error(function(data, scope){
      utilSer.showFlashMsg($scope, "error", 'grAcctResp', data, true);
    })
  }

  $scope.status = {
    isGrTempleteOpen: false,
    isGrTempleteMod: false
  }
  $scope.toggled = function(open) {
    if(!open && $scope.status.isGrTempleteMod){
      $scope.status.isGrTempleteMod=false;
    }
  };
  $scope.saveGrTemplate = function(items, item, code, grId){
    if(code==1){
      if( item && items.indexOf(item)==-1){
        items.push(item)
        $scope.status.isGrTempleteMod=true;
      }
    }
    if(code==2){
      items.splice(items.indexOf(item) ,1)
      $scope.status.isGrTempleteMod=true;
    }
    if(code==3){
      if($scope.status.isGrTempleteOpen==false && $scope.status.isGrTempleteMod==true){
        $http.put("/user/"+$localStorage.userId+"/group", {"updateTypeCode": "4", "groupId":grId, "grTemplate": items})
        .success(function(data, scope){
          utilSer.showFlashMsg($scope, "success", 'grAcctResp', data, true);
          $scope.status.isGrTempleteMod=false;
        })
        .error(function(data, scope){
          utilSer.showFlashMsg($scope, "error", 'grAcctResp', data, true);
          $scope.status.isGrTempleteMod=false;
        })
      }
    }
  }

})
