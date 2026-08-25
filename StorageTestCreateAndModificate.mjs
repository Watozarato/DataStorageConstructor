import { DataStorage } from "./DataStorageConstructor.mjs";
var log=console.log;
var db=DataStorage.create(100,{
		minimizeBytesToBoolFields:true
	})
	.addFieldUniqueValues("Id", "Int32", 0)
	.addFieldAnyValues("addData", "String")
	.addFieldAnyValues("isAdmin", "Bool", false)
	.addFieldAnyValues("banned", "Bool", false)
	.addFieldAnyValues("newbie", "Bool")
	.setCallbackAllocation(function(){
		this.allocateMemoryForRecords(100)
	})
	.endCreation();
db.addRecordByObject({Id:-100_525_999, addData:"creator", isAdmin:true})
db.addRecordByObject({Id:-908_126_445, addData:"register:01.01.2025"})
db.addRecordByObject({Id:-366_809_152, addData:"register:01.02.2025"})
db.setRecordDataByObject(2, {banned:true})
log(db.getRecordsData())
log(db.getInfo());
var copy=DataStorage.createFrom(JSON.stringify(db.getInfo()), db.getBuffer(), {
    modifications:{
        addFields:[
            {field:createFieldAnyValues("addData2", "String")},
            {field:createFieldAnyValues("isOperator", "Bool")}
        ]
    },
    callbackAllocation: function(){
        this.allocateMemoryForRecords(100)
    }
})
log(copy.getRecordsData())
log(copy.getInfo())