/*
	Терминология внутренняя для этого файла:
	Pointer - Number, по которому ищутся данные в Хранилище для данных отличающихся от чисел

	"Ссылочным" тип называется, если его будут хранить по pointer

	Specific Type/Value - тип/значение, который будет храниться в Хранилище как "ссылочный"
	Также может называться как Reference Type.

	Special Type - тип, который является не стандартным (например Uint24)
*/
/*
	Правила файла:
	* Все методы начинающиеся с check обязаны возвращать "success" | string
	* Все методы начинающиеся с is обязаны возвращать boolean
*/
/*
	//Схема буффера
	//Порядок схемы: fields, data обязан гарантироваться
	//Часть буффера с данными полей называется - Буффер полей
	fields:[
		{
			value: N-байт
			//Опционально в конце может быть несколько байт под Bool поля
		}
	]
	//Часть не относящаяся к данным полей (сохраненные по pointers структуры) - Буффер данных
	data:[
		//Запись
		//Правило: length - кол-во байт на все значения данного, указывается в UTF-8 формате (экономим байты)
		{
			//Варианты описания записи
			{
				//Для Null
				type of value: 1 байт
				pointer: 2 | 4 | 8 байт
			}
			{
				//ObjectDynamicStructure
				type of value: 1 байт
				pointer: 2 | 4 | 8 байт
				length of value: 1-4 byte
				records: [
					{
						key: pointer
						value: N-байт
					}
				]
			}
			{
				//ArrayForDataStorage
				type of value: 1 байт
				pointer: 2 | 4 | 8 байт
				length of value: 1-4 byte (сколько байт под value используется)
				records: [
					{
						value: N-байт
					}
				]
			}
			{
				//Классовый объект
				//не реализовано
			}
		}
	]
*/
/**
 * Типы кодировок для строк
 * @typedef {"UTF-8" |"UTF-16"} DataStorageStringEncodingTypes
*/
/**
 * Типы для Number значений
 * @typedef {"Uint8" | "Uint16" | "Uint32" | "Int8" | "Int16" | "Int32" | "SafeFloat32" | "SafeFloat64"} DataStorageNumberTypesForField
*/
/** 
 * Перечисление специальных типов для полей в Хранилище 
 * Под термином "Специальные типы" предполагаются типы, которых нет в стандартном DataView
 * @typedef {"Uint24"} DataStorageSpecialTypesForField
*/
/** Типы для BigInt из DataView
 * @typedef {"BigInt64" | "BigUint64"} DataStorageBigIntTypesForField
*/
/** @typedef {"Bool"} DBBooleanTypes*/
/**
 * Перечисление типов структур валидных для хранилища
 * @typedef {ObjectDynamicStructure | ArrayForDataStorage} DataStorageStructureValueTypes
 */
/** 
 * Под термином "Значение-указатель тип" предполагаются данные, сохраняемые по указателям  
 * Также имеет псевдоним "Специфичный тип" - осталось от прошлых версий кода
 * @typedef {string | null | DataStorageStructureValueTypes} DBReferenceValueTypes
*/
/** Перечисление каких типов JS-данные могут быть использованы в хранилище
 * @typedef {number | boolean | bigint | DBReferenceValueTypes} JStypesToDBValue
*/
/** Перечисление какие типы в общем могут быть
 * @typedef {'String' | 'AnyStructure' | 'DynamicStructure' | DataStorageNumberTypesForField | DataStorageBigIntTypesForField | DataStorageSpecialTypesForField | DBBooleanTypes | "Dynamic"} DataStorageAllTypesForField
*/
/** Типы для Dynamic полей
 * @typedef {"Null" | "Int32" | "Number" | "Bool" | "String" | "BigInt64" | "BigUint64" | "DynamicStructure" | "Array"} DataStorageTypesForFieldWithDynamicType
*/
/**
 * Объект поля в хранилище
 * @typedef {{
 *   name:string,
 *   type:DataStorageAllTypesForField,
 *   offset?:number,
 *   isFieldUniqueValues:boolean,
 *   defaultValue?: DescriptionValue
 * }} DataStorageField
*/
/**
 * Объект, где ключ - имя поля, значение - объект поля
 * @typedef {Record<string,DataStorageField>} ObjectDBFields
 */
/** 
 * Массив где все значения - объекты полей
 * @typedef {DataStorageField[]} ArrayDBFields
*/
/**
 * Объект записи из хранилища.  
 * Ключ - имя поля. Значение - валидное JS-значение
 * @typedef {Record<string,JStypesToDBValue>} ObjectDBRecord
*/
/** 
 * Объект Map, содержащий в себе по ключу (имя поля) JS-значения
 * @typedef {Map<string,JStypesToDBValue>} MapObjectDBRecord
*/
/**
 * Перечисление настроек для Numeric типов
 * @typedef {"error" | "toRange"} DataStorageSettingNumberToRange
*/
/**
 * Эта функция будет вызываться когда число записей станет равно числу выделенных записей  
 * Рекомендуется в эту функцию добавить вызов метода на выделение памяти
 * @callback CallbackAllocation
 * @param {number} currentRecords
 * @this {DataStorageFilling}
 */
/** Максимум полей в хранилище */
var maxFieldsCountInStorage=512;
var maxPropsInObjectDynamicStructure=256;
var maxValuesInArrayForDataStorage=65535;
/**
 * Проверить: есть ли ключ в самом объекте
 * @param {Object} object 
 * @param {string} key 
 */
function isObjectHasSelfProperty(object, key){
	return Object.prototype.hasOwnProperty.call(object, key);
}
/**
 * @typedef {"string" | "number" | "bigint" | "boolean" | "DynamicStructure"} DataStorageTypesOfValues
 */
/**
 * @typedef {Object} DataStorageFieldTypeDescriptionAdditionDataForCheckValue
 * @property {DataStorageSettingNumberToRange} numberOutRange
 * @property {DataStorageStringEncodingTypes} stringEncoding
 */
/**
 * @callback DataStorageFieldTypeDescriptionMethodCheckValue
 * @param {DataStorageField} field
 * @param {JStypesToDBValue} value
 * @param {DataStorageFieldTypeDescriptionAdditionDataForCheckValue} additionalData
 * @returns {"success" | string}
 */
/**
 * @callback DataStorageFieldTypeDescriptionValidateValue
 * @param {DataStorageField} field
 * @param {JStypesToDBValue} value
 * @param {DataStorageFieldTypeDescriptionAdditionDataForCheckValue} additionalData
 * @returns {JStypesToDBValue}
 */
/**
 * @typedef {Object} DataStorageFieldTypeDescriptionAdditionDataForGetSetMethods
 * @property {boolean} littleEndian
 * @property {DataStorageMapPointerToSpecificValue} mapPointerToSpecificValue
 * @property {DataStorageMapSpecificValueToPointer} mapSpecificValueToPointer
 * @property {boolean} minimizeBytesToBoolFields
 * @property {DataStorageField[]} arrayFieldsBoolType
 * @property {DataStorageSetCacheRecordAboutValue} setCacheRecordAboutValue
 */
/**
 * @callback DataStorageFieldTypeDescriptionMethodGetValue
 * @param {DataView | InnerExtendedDataView} dataview
 * @param {DataStorageField} field
 * @param {number} offset
 * @param {DataStorageFieldTypeDescriptionAdditionDataForGetSetMethods} additionalData
 * @returns {JStypesToDBValue}
 */
/**
 * @callback DataStorageFieldTypeDescriptionMethodSetValue
 * @param {DataView | InnerExtendedDataView} dataview
 * @param {DataStorageField} field
 * @param {number} offset
 * @param {JStypesToDBValue} value
 * @param {DataStorageFieldTypeDescriptionAdditionDataForGetSetMethods} additionalData
 */
/**
 * @typedef {Object} DataStorageFieldTypeDescription
 * @property {number | string | bigint | null} defaultValue
 * @property {number} byteSize
 * @property {boolean} isSpecialType
 * @property {DataStorageFieldTypeDescriptionMethodCheckValue} checkValue Возвращает "success", если значение валидно, иначе текст с ошибкой
 * @property {DataStorageFieldTypeDescriptionValidateValue} [validateValue]
 * @property {DataStorageFieldTypeDescriptionMethodGetValue} getValue
 * @property {DataStorageFieldTypeDescriptionMethodSetValue} setValue
 */
/** @type {DataStorageFieldTypeDescriptionMethodGetValue} */
var functionGetValueByPointer=function(dataview, field, offset, additionalData){
	var pointer=dataview.getFloat64(offset, additionalData.littleEndian);
	var value=additionalData.mapPointerToSpecificValue.get(pointer);
	return value;
}
/** @type {DataStorageFieldTypeDescriptionMethodSetValue} */
var functionSetValueByPointer=function(dataview, field, offset, value, additionalData){
	var checking=additionalData.mapSpecificValueToPointer.has(value);
	if(checking){
		var pointer=additionalData.mapSpecificValueToPointer.get(value);
	} else {
		var pointer=additionalData.setCacheRecordAboutValue(value);
	}
	dataview.setFloat64(offset, pointer, additionalData.littleEndian);
}
/** @type {Record<DataStorageAllTypesForField,DataStorageFieldTypeDescription>} */
var AllTypesForDataStorageField={
	"Uint8":{
		byteSize:1,
		defaultValue:0,
		isSpecialType:false,
		checkValue(field, value, additionalData){
			var result="success";
			if(!Number.isInteger(value)) result="Field with type Uint8 can store only integer number";
			else if(value>255) result="value for Field with type Uint8 cant be more 255";
			else if(value<0) result="value for Field with type Uint8 cant be less 0";
			return result;
		},
		validateValue(field, value, additionalData){
			var result=value;
			if(additionalData.numberOutRange==="toRange"){
				if(value>255) result=255;
				else if(value<0) result=0;
			}
			return result;
		},
		getValue(dataview, field, offset, additionalData){
			return dataview.getUint8(offset);
		},
		setValue(dataview, field, offset, value, additionalData){
			dataview.setUint8(offset, value);
		}
	},
	"Uint16":{
		byteSize:2,
		defaultValue:0,
		isSpecialType:false,
		checkValue(field, value, additionalData){
			var result="success";
			if(!Number.isInteger(value)) result="Field with type Uint16 can store only integer number";
			else if(value>65535) result="value for Field with type Uint16 cant be more 65535";
			else if(value<0) result="value for Field with type Uint16 cant be less 0";
			return result;
		},
		validateValue(field, value, additionalData){
			var result=value;
			if(additionalData.numberOutRange==="toRange"){
				if(value>65535) result=65535;
				else if(value<0) result=0;
			}
			return result;
		},
		getValue(dataview, field, offset, additionalData){
			return dataview.getUint16(offset, additionalData.littleEndian);
		},
		setValue(dataview, field, offset, value, additionalData){
			dataview.setUint16(offset, value, additionalData.littleEndian);
		}
	},
	"Uint24":{
		byteSize:3,
		defaultValue:0,
		isSpecialType:true,
		checkValue(field, value, additionalData){
			var result="success";
			if(!Number.isInteger(value)) result="Field with type Uint24 can store only integer number";
			else if(value>16_777_215) result="value for Field with type Uint24 cant be more 16_777_215";
			else if(value<0) result="value for Field with type Uint24 cant be less 0";
			return result;
		},
		validateValue(field, value, additionalData){
			var result=value;
			if(additionalData.numberOutRange==="toRange"){
				if(value>16_777_215) result=16_777_215;
				else if(value<0) result=0;
			}
			return result;
		},
		getValue(dataview, field, offset, additionalData){
			return dataview.getUint24(offset, additionalData.littleEndian);
		},
		setValue(dataview, field, offset, value, additionalData){
			dataview.setUint24(offset, value, additionalData.littleEndian);
		}
	},
	"Uint32":{
		byteSize:4,
		defaultValue:0,
		isSpecialType:false,
		checkValue(field, value, additionalData){
			var result="success";
			if(!Number.isInteger(value)) result="Field with type Uint32 can store only integer number";
			else if(value>4_294_967_295) result="value for Field with type Uint32 cant be more 4_294_967_295";
			else if(value<0) result="value for Field with type Uint32 cant be less 0";
			return result;
		},
		validateValue(field, value, additionalData){
			var result=value;
			if(additionalData.numberOutRange==="toRange"){
				if(value>4_294_967_295) result=4_294_967_295;
				else if(value<0) result=0;
			}
			return result;
		},
		getValue(dataview, field, offset, additionalData){
			return dataview.getUint32(offset, additionalData.littleEndian);
		},
		setValue(dataview, field, offset, value, additionalData){
			dataview.setUint32(offset, value, additionalData.littleEndian);
		}
	},
	"Int8":{
		byteSize:1,
		defaultValue:0,
		isSpecialType:false,
		checkValue(field, value, additionalData){
			var result="success";
			if(!Number.isInteger(value)) result="Field with type Int8 can store only integer number";
			else if(value>127) result="value for Field with type Int8 cant be more 127";
			else if(value<-128) result="value for Field with type Int8 cant be less -128";
			return result;
		},
		validateValue(field, value, additionalData){
			var result=value;
			if(additionalData.numberOutRange==="toRange"){
				if(value>127) result=127;
				else if(value<-128) result=-128;
			}
			return result;
		},
		getValue(dataview, field, offset, additionalData){
			return dataview.getInt8(offset);
		},
		setValue(dataview, field, offset, value, additionalData){
			dataview.setInt8(offset, value);
		}
	},
	"Int16":{
		byteSize:2,
		defaultValue:0,
		isSpecialType:false,
		checkValue(field, value, additionalData){
			var result="success";
			if(!Number.isInteger(value)) result="Field with type Int16 can store only integer number";
			else if(value>32767) result="value for Field with type Int16 cant be more 32767";
			else if(value<-32768) result="value for Field with type Int16 cant be less -32768";
			return result;
		},
		validateValue(field, value, additionalData){
			var result=value;
			if(additionalData.numberOutRange==="toRange"){
				if(value>32767) result=32767;
				else if(value<-32768) result=-32768;
			}
			return result;
		},
		getValue(dataview, field, offset, additionalData){
			return dataview.getInt16(offset, additionalData.littleEndian);
		},
		setValue(dataview, field, offset, value, additionalData){
			dataview.setInt16(offset, value, additionalData.littleEndian);
		}
	},
	"Int32":{
		byteSize:4,
		defaultValue:0,
		isSpecialType:false,
		checkValue(field, value, additionalData){
			var result="success";
			if(!Number.isInteger(value)) result="Field with type Int32 can store only integer number";
			else if(value>2_147_483_647) result="value for Field with type Int32 cant be more 2_147_483_647";
			else if(value<-2_147_483_648) result="value for Field with type Int32 cant be less -2_147_483_648";
			return result;
		},
		validateValue(field, value, additionalData){
			var result=value;
			if(additionalData.numberOutRange==="toRange"){
				if(value>2_147_483_647) result=2_147_483_647;
				else if(value<-2_147_483_648) result=-2_147_483_648;
			}
			return result;
		},
		getValue(dataview, field, offset, additionalData){
			return dataview.getInt32(offset, additionalData.littleEndian);
		},
		setValue(dataview, field, offset, value, additionalData){
			dataview.setInt32(offset, value, additionalData.littleEndian);
		}
	},
	"SafeFloat32":{
		byteSize:4,
		defaultValue:0,
		isSpecialType:false,
		checkValue(field, value, additionalData){
			var result="success";
			if(typeof value!=="number") result="Field with type Float32 can store only number";
			else if(value>16_777_215) result="value for Field with type Float32 cant be more 16_777_215";
			else if(value<-16_777_215) result="value for Field with type Float32 cant be less -16_777_215";
			return result;
		},
		validateValue(field, value, additionalData){
			var result=value;
			if(additionalData.numberOutRange==="toRange"){
				if(value>16_777_215) result=16_777_215;
				else if(value<-16_777_215) result=-16_777_215;
			}
			return result;
		},
		getValue(dataview, field, offset, additionalData){
			return dataview.getFloat32(offset, additionalData.littleEndian);
		},
		setValue(dataview, field, offset, value, additionalData){
			dataview.setFloat32(offset, value, additionalData.littleEndian);
		}
	},
	"SafeFloat64":{
		byteSize:8,
		defaultValue:0,
		isSpecialType:false,
		checkValue(field, value, additionalData){
			var result="success";
			if(typeof value!=="number") result="Field with type Float64 can store only number";
			else if(value>9_007_199_254_740_991) result="value for Field with type Float64 cant be more 9_007_199_254_740_991";
			else if(value<-9_007_199_254_740_991) result="value for Field with type Float64 cant be less -9_007_199_254_740_991";
			return result;
		},
		validateValue(field, value, additionalData){
			var result=value;
			if(additionalData.numberOutRange==="toRange"){
				if(value>9_007_199_254_740_991) result=9_007_199_254_740_991;
				else if(value<-9_007_199_254_740_991) result=-9_007_199_254_740_991;
			}
			return result;
		},
		getValue(dataview, field, offset, additionalData){
			return dataview.getFloat64(offset, additionalData.littleEndian);
		},
		setValue(dataview, field, offset, value, additionalData){
			dataview.setFloat64(offset, value, additionalData.littleEndian);
		}
	},
	"BigUint64":{
		byteSize:8,
		defaultValue:0n,
		isSpecialType:false,
		checkValue(field, value, additionalData){
			var result="success";
			if(typeof value!=="bigint") result="Field with type BigUint64 can store only bigint";
			else if(value>18_446_744_073_709_551_615n) result="value for Field with type BigUint64 cant be more 18_446_744_073_709_551_615n";
			else if(value<0) result="value for Field with type BigUint64 cant be less 0";
			return result;
		},
		validateValue(field, value, additionalData){
			var result=value;
			if(additionalData.numberOutRange==="toRange"){
				if(value>18_446_744_073_709_551_615n) result=18_446_744_073_709_551_615n;
				else if(value<0n) result=0n;
			}
			return result;
		},
		getValue(dataview, field, offset, additionalData){
			return dataview.getBigUint64(offset, additionalData.littleEndian);
		},
		setValue(dataview, field, offset, value, additionalData){
			dataview.setBigUint64(offset, value, additionalData.littleEndian);
		}
	},
	"BigInt64":{
		byteSize:8,
		defaultValue:0n,
		isSpecialType:false,
		checkValue(field, value, additionalData){
			var result="success";
			if(typeof value!=="bigint") result="Field with type BigInt64 can store only bigint";
			else if(value>9_223_372_036_854_775_807n) result="value for Field with type BigInt64 cant be more 9_223_372_036_854_775_807n";
			else if(value<-9_223_372_036_854_775_808n) result="value for Field with type BigInt64 cant be less -9_223_372_036_854_775_808n";
			return result;
		},
		validateValue(field, value, additionalData){
			var result=value;
			if(additionalData.numberOutRange==="toRange"){
				if(value>9_223_372_036_854_775_807n) result=9_223_372_036_854_775_807n;
				else if(value<-9_223_372_036_854_775_808n) result=-9_223_372_036_854_775_808n;
			}
			return result;
		},
		getValue(dataview, field, offset, additionalData){
			return dataview.getBigInt64(offset, additionalData.littleEndian);
		},
		setValue(dataview, field, offset, value, additionalData){
			dataview.setBigInt64(offset, value, additionalData.littleEndian);
		}
	},
	"Dynamic":{
		byteSize:9,
		defaultValue:0,
		isSpecialType:false,
		checkValue(field, value, additionalData){
			var result="success";
			switch(typeof value){
				case "string":
				case "number":
				case "bigint":
				case "boolean":
					break;
				case "object":
					if(
						(value!==null) &&
						(getInitialObjectOfStructureForStorage(value)===null)
					) result="Field with type Dynamic: invalid class of Object";
					break;
				default:
					result=`Field with type Dynamic cant store ${typeof value} type`;
					break;
			}
			return result;
		},
		getValue(dataview, field, offset, additionalData){
			var code=dataview.getUint8(offset);
			switch(getTypeDBFromNumberCode(code)){
				case "Number":
					var value=dataview.getFloat64(offset+1, additionalData.littleEndian);
					break;
				case "Bool":
					var value=!!dataview.getUint8(offset+1, additionalData.littleEndian);
					break;
				case "String":
				case "DynamicStructure":
				case "Array":
					var pointer=dataview.getFloat64(offset+1, additionalData.littleEndian);
					var value=additionalData.mapPointerToSpecificValue.get(pointer);
					break;
				case "BigInt64":
					var value=dataview.getBigInt64(offset+1, additionalData.littleEndian);
					break;
				case "BigUint64":
					var value=dataview.getBigUint64(offset+1, additionalData.littleEndian);
					break;
			}
			return value;
		},
		setValue(dataview, field, offset, value, additionalData){
			var littleEndian=additionalData.littleEndian;
			var mapSpecificValueToPointer=additionalData.mapSpecificValueToPointer;
			switch(typeof value){
				case "number":
					dataview.setUint8(offset, getNumberCodeFromTypeDB("Number"));
					dataview.setFloat64(offset+1, value, littleEndian);
					break;
				case "bigint":
					/** @type {DataStorageBigIntTypesForField} */
					var typeOfBigInt="BigInt64";
					if(value>9_223_372_036_854_775_807n) typeOfBigInt="BigUint64";
					dataview.setUint8(offset, getNumberCodeFromTypeDB(typeOfBigInt));
					if(typeOfBigInt==="BigInt64") dataview.setBigInt64(offset+1, value, littleEndian);
					if(typeOfBigInt==="BigUint64") dataview.setBigUint64(offset+1, value, littleEndian);
					break;
				case "boolean":
					dataview.setUint8(offset, getNumberCodeFromTypeDB("Bool"));
					dataview.setUint8(offset+1, (+value), littleEndian);
					break;
				case "string":
					dataview.setUint8(offset, getNumberCodeFromTypeDB("String"));
					var checking=mapSpecificValueToPointer.has(value);
					if(checking){
						var pointer=mapSpecificValueToPointer.get(value);
					} else {
						var pointer=additionalData.setCacheRecordAboutValue(value);
					}
					dataview.setFloat64(offset+1, pointer, littleEndian);
					break;
				case "object":
					dataview.setUint8(offset, getNumberCodeFromStructure(value));
					var checking=mapSpecificValueToPointer.has(value);
					if(checking){
						var pointer=mapSpecificValueToPointer.get(value);
					} else {
						var pointer=additionalData.setCacheRecordAboutValue(value);
					}
					dataview.setFloat64(offset+1, pointer, littleEndian);
					break;
			}
		}
	},
	"AnyStructure":{
		byteSize:8,
		defaultValue:0,
		isSpecialType:false,
		checkValue(field, value, additionalData){
			var result="success";
			if(getInitialObjectOfStructureForStorage(value)===null) result="Field with type AnyStructure: invalid class of Object";
			return result;
		},
		getValue: functionGetValueByPointer,
		setValue: functionSetValueByPointer
	},
	"DynamicStructure":{
		byteSize:8,
		defaultValue:null,
		isSpecialType:false,
		checkValue(field, value, additionalData){
			var result="success";
			if(getInitialObjectOfStructureForStorage(value)===ObjectDynamicStructure) result="Field with type DynamicStructure can store only ObjectDynamicStructure";
			return result;
		},
		getValue: functionGetValueByPointer,
		setValue: functionSetValueByPointer
	},
	"Bool":{
		byteSize:1, //Помните, что особая настройка при создании хранилища может аннулировать действие этого параметра
		defaultValue:false,
		isSpecialType:false,
		checkValue(field, value, additionalData){
			var result="success";
			if(typeof value!=="boolean") result="Field with type Bool can store only Boolean";
			return result;
		},
		getValue(dataview, field, offset, additionalData){
			if(additionalData.minimizeBytesToBoolFields===false){
				var value=(!!dataview.getUint8(offset));
			} else {
				var indexBit=additionalData.arrayFieldsBoolType.indexOf(field)%8;
				var value=(!!((dataview.getUint8(offset)>>indexBit)&1));
			}
			return value;
		},
		setValue(dataview, field, offset, value, additionalData){
			if(additionalData.minimizeBytesToBoolFields===false){
				dataview.setUint8(offset, (+value));
			} else {
				var valueInField=dataview.getUint8(offset);
				var indexBit=additionalData.arrayFieldsBoolType.indexOf(field)%8;
				if(value){
					var valueToPut=(valueInField|(1<<indexBit));
				} else {
					var valueToPut=(~(~valueInField|(1<<indexBit)));
				}
				dataview.setUint8(offset, valueToPut);
			}
		}
	},
	"String":{
		byteSize:8,
		defaultValue:"",
		isSpecialType:false,
		checkValue(field, value, additionalData){
			var result="success";
			if(typeof value!=="string") result="Field with type String can store only String";
			switch(additionalData.stringEncoding){
				case "UTF-8":
					var byteSize=getLengthForStringInUTF8(value);
					if(byteSize>2097152) result="Field with type String cant store String with byteLength more then 2MB";
					break;
				case "UTF-16":
					var byteSize=value.length*2;
					if(byteSize>2097152) result="Field with type String cant store String with byteLength more then 2MB";
					break;
			}
			return result;
		},
		getValue: functionGetValueByPointer,
		setValue: functionSetValueByPointer
	}
};
/** 
 * Перечисление специальных типов для полей в Хранилище 
 * @type {DataStorageSpecialTypesForField}
 */
var SpecialTypesForDataStorageField=[];
for(var key of Object.keys(AllTypesForDataStorageField)){
	if(AllTypesForDataStorageField[key].isSpecialType) SpecialTypesForDataStorageField.push(key);
}
/**
 * Объект, где ключ - имя бекап-типа, значение - number, код этого типа, нужно для бекапа хранилища 
 * @type {Record<DataStorageTypesForFieldWithDynamicType,number>}*/
var TypeDataStorageSavingDataToCode={
	//0 - зарезервированный код
	/*
		null выделили отдельным типом, чтобы не выделять под него 8 байт
		считайте, что это ленивая реализация логики: если в поле указан 1, то отдайте null
		Пошли на нее, чтобы в каждую новую функцию get/set данных не писать такую условность
	*/
	"Null": 1,
	"Int32": 2,
	"Number": 3,
	"Bool": 4,
	"String": 5,
	"BigUint64": 6,
	"BigInt64": 7,
	"DynamicStructure": 8,
	"Array": 9,
	"CustomObject": 64
};
/**
 * Объект, где ключ - номер типа, значение - имя бекап-типа
 * @type {Object<number, DataStorageTypesForFieldWithDynamicType>}
 */
var CodeToTypeDataStorageSavingData={};
for(var key of Object.keys(TypeDataStorageSavingDataToCode)) CodeToTypeDataStorageSavingData[TypeDataStorageSavingDataToCode[key]]=key;
/**
 * Получить номер-код (для хранения в буффере значений) по типу данных Хранилища
 * @param {DataStorageTypesForFieldWithDynamicType} type 
 * @returns {number}
 */
function getNumberCodeFromTypeDB(type){
	return TypeDataStorageSavingDataToCode[type];
}
/**
 * Получить номер-код по структуре  
 * Кинет ошибку, если структура неожидаемого класса 
 * @param {DataStorageStructureValueTypes} type 
 * @returns {number}
 */
function getNumberCodeFromStructure(struct){
	switch(Object.getPrototypeOf(struct)){
		case ObjectDynamicStructure.prototype:
			var result=getNumberCodeFromTypeDB("DynamicStructure");
			break;
		case ArrayForDataStorage.prototype:
			var result=getNumberCodeFromTypeDB("Array");
			break;
		default: throw Error("Unknown structure");
	}
	return result;
}
/**
 * Получить тип данных Хранилища по номеру
 * @param {number} code
 * @returns {DataStorageTypesForFieldWithDynamicType}
 */
function getTypeDBFromNumberCode(code){
	return CodeToTypeDataStorageSavingData[code];
}
/**
 * Коллекция Хранилищ и заданных для них callbackAllocation  
 * Используется для copy метода в DataStorage
 * @type {WeakMap<DataStorageFilling, CallbackAllocation>}
 */
var mapStorageToCallbackAllocation=new WeakMap();
/**
 * Коллекция Хранилищ и заданных для них #getBuffer
 * Используется для copy метода в DataStorage
 * @type {WeakMap<DataStorageFilling, Function>}
 */
var mapStorageToMethodForGetBuffer=new WeakMap();
/**
 * Данный Symbol используется для modifications addFields в итераторах - верните как значение его в итераторе, чтобы в поле записи было установлено дефолт.значение
 * @type {Symbol}
 */
var SymbolUseDefaultValue=Symbol("defaultValueInIterator");
var DataStorage={
	/**
	 * Создать Хранилище и перейти к настройке полей данных в ней  
	 * 1arg: на сколько записей выделить память сразу  
	 * 2arg: объект с настройками Хранилища  
	 * Свойства для объекта настроек:
	 * * littleEndian: boolean - порядок записи байт
	 * * numberOutRange: string - что делать если number выходит за рамки выбранного типа. При "toRange" - привести к диапазону, при "error" - выброс ошибки
	 * * stringEncoding: string - кодировка строк в Хранилище. Допустимо "UTF-8" | "UTF-16"
	 * * recordsCountForAdditionInReallocation: number
	 * * minimizeBytesToBoolFields: boolean - минимизировать выделяемую память под поля с Bool типом
	 * * allowSpecialDataViewTypes: boolean - разрешить использовать специальные типы (например Uint24)
	 * 
	 * По умолчанию:  
	 * Кодировка строк: UTF-16  
	 * Если number выходит за рамки выбранного типа: вызвать ошибку  
	 * @param {number} allocatedRecords 
	 * @param {DBCreationObjectSettings} [objectSettings] 
	 * @returns {DB_creating}
	 */
	create(allocatedRecords, objectSettings){
		if(!isValueIsPositiveInteger(allocatedRecords)) throw Error("[DataStorage][create] arg 'allocatedRecords' must be positive integer");
		return new DB_creating(allocatedRecords, objectSettings);
	},
	/**
	 * @typedef {Object} DBSettingsToFromBuffer
	 * @property {CallbackAllocation} callbackAllocation
	 * @property {DBModificationsFieldsOnCreateFrom} [modifications]
	 */
	/**
	 * @typedef {Object} DBModificationsFieldsOnCreateFrom
	 * @property {{
	 *   field:DataStorageField
	 *   typeAddValues?:"default" | "iterator"
	 *   values?: Iterable<JStypesToDBValue>
	 * }[]} [addFields]
	 * @property {string[]} [deleteFields]
	 * @property {number[]} [deleteRecords]
	 */
	/**
	 * Создать Хранилище на основе данных  
	 * 1arg - информация о Хранилище в виде строки JSON (получите ее через метод getInfo())  
	 * 2arg - ArrayBuffer Хранилища  
	 * 3arg - Объект настроек    
	 * Свойства для объекта настроек:
	 * * callbackAllocation - тип function. Функция для вызова, когда число записей стало равно числу выделенных. Обязательный параметр
	 * * modifications - тип object. Модифицирует поля Хранилища на этапе его создания  
	 * 
	 * Объект modifications:
	 * * addFields - опционально, массив объектов. Добавляет в конец массива новые поля
	 * * deleteFields - опционально, массив строк. Удаляет поля по их имени
	 * * deleteRecords - опционально, массив индексов записей. Не добавляет их в создаваемое хранилище
	 * 
	 * Структура объектов для массива addValues в modifications:
	 * * field - объект поля (можете получить через экспортируемую функцию createFieldAnyValues)
	 * * typeAddValues - "default" | "iterator" - по какому принципу добавлять значения
	 * * values - опционально, итерируемый объект, будет использоваться при typeAddValues = "iterator", добавлять данные с итератора в хранилище
	 * @example
	 * import {DataStorage, createFieldAnyValues} from "DataStorageConstructor.mjs";
	 * //fileSystem - допустим это идентификатор у вас, который позволяет данные с файлов использовать
	 * //fileSystem.JSON - сохраненный json объекта полученного через метод getInfo хранилища
	 * //fileSystem.buffer - сохранненый ArrayBuffer хранилища 
	 * var copy=DataStorage.createFrom(fileSystem.JSON, fileSystem.buffer, {
	 *   callbackAllocation:function(){},
	 *   modifications:{
	 *     addFields:[
	 *       {
	 *          typeAddValues:"default", //будет использовать default Value поля для каждой записи
	 *          field:createFieldAnyValues("newdata1", "Float64")
	 *       },
	 *       {
	 *          typeAddValues:"iterator", //для каждой записи будут использоваться значениея из итератора
	 *          field:createFieldAnyValues("newdata2", "Float64"),
	 *          values:[0,1,2,3,4,5] //массив является итерируемым объектом
	 *       }
	 *     ]
	 *     ,deleteFields:["somedata"]
	 *   }
	 * });
	 * @param {string} jsoninfo 
	 * @param {ArrayBuffer} buffer 
	 * @param {DBSettingsToFromBuffer} objectSettings 
	 */
	createFrom(jsoninfo, buffer, objectSettings){
		if(!objectSettings || (typeof objectSettings.callbackAllocation!=="function")) throw Error("[DataStorage][createFrom] 'callbackAllocation' must be setted a function")
		/** @type {ObjectDBInfo} */
		var object=JSON.parse(jsoninfo);
		var objectFields={};
		if(objectSettings.modifications){
			if(objectSettings.modifications.addFields){
				if(!Array.isArray(objectSettings.modifications.addFields)) throw Error("[DataStorage][createFrom][modifications] optional property 'addFields' must be array of objects");
				for(var element of objectSettings.modifications.addFields){
					var field=element.field;
					if(!field) throw Error("[DataStorage][createFrom][modifications][addFields] 'field' must be DBField");
					if(typeof field.isFieldUniqueValues!=="boolean") throw Error("[DataStorage][createFrom][modifications][addFields] property of field 'isFieldUniqueValues' must be boolean");
					if(typeof field.name!=="string") throw Error("[DataStorage][createFrom][modifications][addFields] property of field 'name' must be string type");
					if(getByteSizeOfFieldType(field.type, object.allowSpecialDataViewTypes)===0) throw Error("[DataStorage][createFrom][modifications][addFields] property of field 'type' no valid");
					if(
						(!field.isFieldUniqueValues) &&
						(checkFieldTypeForValueType(field, getDefaultValueFromFieldDescription(field))!=="success")
					) throw Error("[DataStorage][createFrom] defaultValue no compare with type field");
					var checking=checkFieldTypeForValueType(element.field, getDefaultValueFromFieldDescription(element.field));
					if(checking!=="success") throw Error("[DataStorage][createFrom][modifications][addFields] 'defaultValue' no valid for field type");
				}
			}
			if(
				(isObjectHasSelfProperty(objectSettings.modifications, "deleteFields")) &&
				(!Array.isArray(objectSettings.modifications.deleteFields))
			) throw Error("[DataStorage][createFrom][modifications] optional property 'deleteFields' must be array of strings");
			if(
				(isObjectHasSelfProperty(objectSettings.modifications, "deleteRecords")) &&
				(!Array.isArray(objectSettings.modifications.deleteRecords))
			) throw Error("[DataStorage][createFrom][modifications] optional property 'deleteRecords' must be array of positive integers");
		}
		var indexLastFieldUniqueValues=-1;
		for(var i=0; i<object.fields.length; ++i){
			var field=object.fields[i];
			objectFields[field.name]=field;
			if(field.isFieldUniqueValues) indexLastFieldUniqueValues=i;
		}
		return new DataStorageFilling({
			currentRecords:object.currentRecords,
			allocatedRecords:object.allocatedRecords,
			byteSizeOneRecord:object.byteSizeOneRecord,
			indexLastFieldUniqueValues:indexLastFieldUniqueValues,
			callbackAllocation:objectSettings.callbackAllocation,
			arrayFields:object.fields,
			objectFields:objectFields,
			stringEncoding:object.stringEncoding,
			numberOutRange:object.numberOutRange,
			littleEndian:object.littleEndian,
			recordsCountForAdditionInReallocation:object.recordsCountForAdditionInReallocation,
			minimizeBytesToBoolFields:object.minimizeBytesToBoolFields,
			allowSpecialDataViewTypes:object.allowSpecialDataViewTypes,
			arrayBuffer:buffer,
			levelSize:object.levelSize,
			modificationsOnCreateFrom:objectSettings.modifications
		})
	},
	/**
	 * Сделать копию Хранилища  
	 * Второй аргумент - callbackAllocation, если неуказано, будет хранилище будет создано с callbackAllocation тем же, что указанном в копируемом  
	 * Хранилища ничем не будут связаны друг с другом
	 * @param {DataStorageFilling} storageObject 
	 * @param {CallbackAllocation} [callbackAllocation] 
	 * @returns 
	 */
	copy(storageObject, callbackAllocation){
		var funcToCallbackAllocation=null;
		if(callbackAllocation!=null){
			if (typeof callbackAllocation!=="function") throw Error("[DataStorage][copy] callbackAllocation must be function");
			funcToCallbackAllocation=callbackAllocation;
		} else {
			funcToCallbackAllocation=mapStorageToCallbackAllocation.get(storageObject)
		}
		var object=storageObject.getInfo();
		var objectFields={};
		var buffer=mapStorageToMethodForGetBuffer.get(storageObject).call(storageObject);
		var indexLastFieldUniqueValues=-1;
		for(var i=0; i<object.fields.length; ++i){
			var field=object.fields[i];
			objectFields[field.name]=field;
			if(field.isFieldUniqueValues){
				indexLastFieldUniqueValues=i;
			}
		}
		return new DataStorageFilling({
			currentRecords:object.currentRecords,
			allocatedRecords:object.allocatedRecords,
			byteSizeOneRecord:object.byteSizeOneRecord,
			indexLastFieldUniqueValues:indexLastFieldUniqueValues,
			callbackAllocation:funcToCallbackAllocation,
			arrayFields:object.fields,
			objectFields:objectFields,
			stringEncoding:object.stringEncoding,
			numberOutRange:object.numberOutRange,
			littleEndian:object.littleEndian,
			recordsCountForAdditionInReallocation:object.recordsCountForAdditionInReallocation,
			minimizeBytesToBoolFields:object.minimizeBytesToBoolFields,
			allowSpecialDataViewTypes:object.allowSpecialDataViewTypes,
			arrayBuffer:buffer,
			levelSize:object.levelSize,
		})
	},
	/**
	 * Создает ArrayBuffer на основе строки
	 * @param {string} string 
	 * @returns {ArrayBuffer}
	 */
	getBufferFromString(string){
		var view=new Uint8Array(string.length);
		var i=0;
		for(var i=0, max=string.length; i<max; ++i){
			view[i]=string.charCodeAt(i);
		}
		return view.buffer;
	}
}
class DB_creating{
	#recordsCountForAdditionInReallocation=0;
	/** @type {ObjectDBFields} */
	#objectFields={};
	/** @type {ArrayDBFields} */
	#arrayFields=[];
	#allocatedRecords=0;
	#offset=0;
	#byteSizeOneRecord=0;
	/** @type {CallbackAllocation} */
	#callbackAllocation=null;
	#littleEndian=false;
	/** @type {DataStorageSettingNumberToRange} */
	#numberOutRange="error";
	/** @type {DataStorageStringEncodingTypes} */
	#stringEncoding="UTF-16";
	#minimizeBytesToBoolFields=false;
	#allowSpecialDataViewTypes=false;
	#startStringInError="[DataStorage][create]";
	/**
	 * @typedef {{
	 *   littleEndian?:boolean,
	 *   numberOutRange?: DataStorageSettingNumberToRange
	 *   stringEncoding?: DataStorageStringEncodingTypes
	 *   recordsCountForAdditionInReallocation?:number,
	 *   minimizeBytesToBoolFields?:boolean
	 *   allowSpecialDataViewTypes?:boolean
	 * }} DBCreationObjectSettings
	 */
	/**
	 * @param {number} allocatedRecords 
	 * @param {DBCreationObjectSettings} [objectSettings]
	 */
	constructor(allocatedRecords, objectSettings){
		this.#allocatedRecords=allocatedRecords;
		if(objectSettings && typeof objectSettings==="object"){
			this.#littleEndian=!!objectSettings.littleEndian;
			this.#minimizeBytesToBoolFields=!!objectSettings.minimizeBytesToBoolFields;
			this.#allowSpecialDataViewTypes=!!objectSettings.allowSpecialDataViewTypes;
			if(isObjectHasSelfProperty(objectSettings, "numberOutRange")){
				switch(objectSettings.numberOutRange){
					case "error":
					case "toRange":
						this.#numberOutRange=objectSettings.numberOutRange;
						break;
					default: throw Error(this.#startStringInError+" param 'numberOutRange' setting can be only strings: 'error' or 'toRange'");
				}
			}
			if(isObjectHasSelfProperty(objectSettings, "stringEncoding")){
				switch(objectSettings.stringEncoding){
					case "UTF-8":
					case "UTF-16":
						this.#stringEncoding=objectSettings.stringEncoding;
						break;
					default: throw Error(this.#startStringInError+" param 'stringEncoding' setting can be only strings: 'UTF-8' | 'UTF-16'");
				}
			}
			if(isObjectHasSelfProperty(objectSettings, "recordsCountForAdditionInReallocation")){
				if(!isValueIsPositiveInteger(objectSettings.recordsCountForAdditionInReallocation)) throw Error(this.#startStringInError+" param 'recordsCountForAdditionInReallocation' must be positive integer");
				this.#recordsCountForAdditionInReallocation=objectSettings.recordsCountForAdditionInReallocation;
			}
		}
	}
	/**
	 * Добавить поле уникальных значений в Хранилище (значения не могут повторяться)
	 * @param {string} name 
	 * @param {DataStorageAllTypesForField} type 
	 */
	addFieldUniqueValues(name, type){
		var checking=this.#checkInfoBeforeAddField(name, type);
		if(checking!=="success") throw Error(this.#startStringInError+"[addFieldUniqueValues] "+checking);
		var byteSize=getByteSizeOfFieldType(type, this.#allowSpecialDataViewTypes);
		var objectField={name, type, offset:this.#offset, isFieldUniqueValues:true};
		this.#arrayFields.push(objectField);
		this.#objectFields[name]=objectField;
		this.#offset+=byteSize;
		this.#byteSizeOneRecord+=byteSize;
		return this;
	}
	/**
	 * Добавить поле любых значений в Хранилище (значения могут повторяться)
	 * @param {string} name 
	 * @param {DataStorageAllTypesForField} type 
	 * @param {JStypesToDBValue} [defaultValue]
	 */
	addFieldAnyValues(name, type, defaultValue){
		var checking=this.#checkInfoBeforeAddField(name, type);
		if(checking!=="success") throw Error(this.#startStringInError+"[addFieldAnyValues] "+checking);
		var byteSize=getByteSizeOfFieldType(type, this.#allowSpecialDataViewTypes);
		/** @type {DataStorageField} */
		var objectField=createFieldAnyValues(name, type, defaultValue);
		objectField.offset=this.#offset;
		this.#arrayFields.push(objectField);
		this.#objectFields[name]=objectField;
		this.#offset+=byteSize;
		this.#byteSizeOneRecord+=byteSize;
		return this;
	}
	/**
	 * Служебный метод для проверки поля перед его вставкой (здесь собрана общая логика)
	 * @param {string} name 
	 * @param {DataStorageAllTypesForField} type 
	 * @returns {"success" | string}
	 */
	#checkInfoBeforeAddField(name, type){
		var result="success";
		if(getByteSizeOfFieldType(type, this.#allowSpecialDataViewTypes)===0) result=("Type no valid");
		else if(isObjectHasSelfProperty(this.#objectFields,name)) result=(`Field ${name} already has in DB`);
		else if((this.#arrayFields.length+1)>maxFieldsCountInStorage) result=(`Storage cant store more then ${maxFieldsCountInStorage} fields`);
		return result;
	}
	/**
	 * Устанавливает функцию, которая будет вызываться, когда число записей будет равно числу записей на которые выделена память  
	 * В функции this будет равен объекту Хранилища для работы с данными, для удобства работы
	 * @param {CallbackAllocation} func */
	setCallbackAllocation(func){
		if(typeof func!=="function") throw Error(this.#startStringInError+"[setCallbackAllocation] CallbackAllocation must be function");
		this.#callbackAllocation=func;
		return this;
	}
	/**
	 * Закончить создание Хранилища и перейти к работе с данными  
	 * Обязательно установите callbackAllocation (через метод setCallbackAllocation)
	 */
	endCreation(){
		if(typeof this.#callbackAllocation!=="function") throw Error(this.#startStringInError+"[endCreation] CallbackAllocation must be setted");
		return new DataStorageFilling({
			allocatedRecords:this.#allocatedRecords,
			byteSizeOneRecord:this.#offset,
			hasFieldSpecificValues:isFieldsHaveFieldWithSpecificType(this.#arrayFields),
			callbackAllocation:this.#callbackAllocation,
			objectFields:this.#objectFields,
			arrayFields:this.#arrayFields,
			littleEndian:this.#littleEndian,
			numberOutRange:this.#numberOutRange,
			stringEncoding:this.#stringEncoding,
			recordsCountForAdditionInReallocation:this.#recordsCountForAdditionInReallocation,
			minimizeBytesToBoolFields:this.#minimizeBytesToBoolFields,
			allowSpecialDataViewTypes:this.#allowSpecialDataViewTypes
		});
	}
};
class DataStorageFilling{
	/**
	 * Число записей, которые нужно добавить при Resizable Buffer
	 * @type {number}
	 */
	#recordsCountForAdditionInReallocation=0;
	/** Сколько записей до реаллокации */
	#allocatedRecords=0;
	/** Сколько уже записей есть */
	#currentRecords=0;
	/** Число байт на запись */
	#byteSizeOneRecord=0;
	#littleEndian=false;
	/** @type {DataStorageSettingNumberToRange} */
	#numberOutRange="";
	/** @type {DataStorageStringEncodingTypes} */
	#stringEncoding="UTF-16";
	#minimizeBytesToBoolFields=false;
	#allowSpecialDataViewTypes=false;
	/** @type {ArrayDBFields} */
	#arrayFieldsBoolTypes=null;
	/** @type {CallbackAllocation} */
	#callbackAllocation=null;
	/** @type {ObjectDBFields} */
	#objectFields=null;
	/** @type {ArrayDBFields} */
	#arrayFields=null;
	/** @type {ArrayDBFields} */
	#arrayFieldsUniqueValues=null;
	/** @type {ArrayDBFields} */
	#arrayFieldsAnyValues=null;
	#indexLastFieldUniqueValues=-1;
	/** @type {ArrayBuffer} */
	#arrayBuffer=null;
	/**
	 * DataView либо InnerExtendedDataView над буффером этого хранилища
	 * @type {DataView} 
	 */
	#dataView=null;
	/**
	 * Объект динамической структуры помимо основных полей хранилища
	 * @type {ObjectDynamicStructure}
	 */
	#header=null;
	/** 
	 * Структура вида:  
	 * {
	 *    fieldName: Map( value , Set( indexRecord ) )
	 * }
	 * @type {Record<string,Map<JStypesToDBValue, Set<number>>>}} 
	 */
	#cacheFieldsAnyValues=null;
	/** 
	 * Структура вида:  
	 * {
	 *    fieldName: Map( value , indexRecord )
	 * }
	 * @type {Record<string,Map<JStypesToDBValue, number>>} 
	 */
	#cacheFieldsUniqueValues=null;
	/** @typedef {Map<number, DBReferenceValueTypes>} DataStorageMapPointerToSpecificValue*/
	/** @type {DataStorageMapPointerToSpecificValue} */
	#mapPointerToSpecificValue=new Map();
	/** @typedef {Map<DBReferenceValueTypes, number>} DataStorageMapSpecificValueToPointer */
	/** @type {DataStorageMapSpecificValueToPointer} */
	#mapSpecificValueToPointer=new Map();
	/** @type {2 | 4 | 8} */ 
	#countBytesForPointerInBufferOfValues=2;
	#countRecordsForGrowPointerByteSize=getCountRecordsForGrowPointer(this.#countBytesForPointerInBufferOfValues);
	#pointerSpecificValue=0;
	#maxPointerSpecificValue=2**(8*this.#countBytesForPointerInBufferOfValues)-1;
	/** 
	 * @typedef {Object} OperationsForSpecificValuesInStorage
	 * @property {function} setCacheRecord
	 * @property {function} createArrayForStorage
	 */
	/** @type {OperationsForSpecificValuesInStorage} */
	#objectCacheOperations={
		/** @this {DataStorageFilling} */
		setCacheRecord:function(value){
			this.#setCacheRecordAboutValue(value);
			this.#callReferenceCleanerIfManyValues();
		},
		/** @this {DataStorageFilling} */
		createArrayForStorage:(function(array){
			return this.#createArrayForStorage(array);
		}).bind(this)
	};
	/** @type {DataStorageFieldTypeDescriptionAdditionDataForCheckValue} */
	#additionalDataForCheckValue=null;
	/** @type {DataStorageFieldTypeDescriptionAdditionDataForGetSetMethods} */
	#additionalDataForGetSetMethods=null;
	/**
	 * Сюда вы можете указать свойства с данными, которые не нужно удалять  
	 * Например здесь описан header хранилища  
	 * Важно: запрещено использовать 0 (зарезервиравано под null)
	 */
	#arrayFuncsForSpecialPropsStorage=[
		{
			/** @this {DataStorageFilling} */
			getValue(){
				return this.#header;
			},
			/** @this {DataStorageFilling} */
			onCreation(){
				this.#header=this.#createObjectDynamicStructure();
				this.#setCacheRecordAboutValue(this.#header, 1);
			},
			/** @this {DataStorageFilling} */
			onBackup(){
				this.#header=this.#mapPointerToSpecificValue.get(1);
			}
		}
	];
	/**
	 * @typedef {{
	 *   allocatedRecords:number,
	 *   byteSizeOneRecord:number,
	 *   callbackAllocation:function,
	 *   objectFields:Record<string, DataStorageField>,
	 *   arrayFields:DataStorageField[],
	 *   littleEndian:boolean,
	 *   numberOutRange:DataStorageSettingNumberToRange,
	 *   stringEncoding: DataStorageStringEncodingTypes,
	 *   recordsCountForAdditionInReallocation:number,
	 *   minimizeBytesToBoolFields:boolean,
	 *   allowSpecialDataViewTypes:boolean,
	 *   arrayBuffer?:ArrayBuffer
	 *   currentRecords?:number
	 *   levelSize?:number,
	 *   modificationsOnCreateFrom?: DBModificationsFieldsOnCreateFrom
	 * }} DBFillingObjectSettings
	*/
	/** @param {DBFillingObjectSettings} objectSettings */
	constructor(objectSettings){
		//Добавьте новое хранилище в коллекцию и передайте туда установленный кол-бек
		mapStorageToCallbackAllocation.set(this, objectSettings.callbackAllocation);
		mapStorageToMethodForGetBuffer.set(this, this.#getBuffer);
		//Получаем общие данные
		//Эти данные ОБЯЗАТЕЛЬНЫ К ПЕРЕДАЧЕ
		this.#allocatedRecords=objectSettings.allocatedRecords;
		this.#byteSizeOneRecord=objectSettings.byteSizeOneRecord;
		this.#callbackAllocation=objectSettings.callbackAllocation;
		this.#objectFields=objectSettings.objectFields;
		this.#arrayFields=objectSettings.arrayFields;
		this.#littleEndian=objectSettings.littleEndian;
		this.#numberOutRange=objectSettings.numberOutRange;
		this.#stringEncoding=objectSettings.stringEncoding;
		this.#recordsCountForAdditionInReallocation=objectSettings.recordsCountForAdditionInReallocation||0;
		this.#minimizeBytesToBoolFields=objectSettings.minimizeBytesToBoolFields;
		this.#allowSpecialDataViewTypes=objectSettings.allowSpecialDataViewTypes;
		var modifications=objectSettings.modificationsOnCreateFrom;
		//Делаем общие вещи для любого из путей сюда (создание || бекап)
		{
			//Вопреки общности вещей, делаем парс модификаций, чтобы поменять поля
			if(modifications && (modifications.addFields || modifications.deleteFields)){
				/**
				 * Обязаны гарантировать, что этот идентификатор будет связан со структурой только в случае наличия модификаций полей
				 * @type {ArrayDBFields}
				 */
				var arrayNewFields=[];
				if(modifications.deleteFields){
					for(var field of this.#arrayFields){
						if(!modifications.deleteFields.find(elem=>elem===field.name)){
							arrayNewFields.push(field);
						}
					}
				} else arrayNewFields=this.#arrayFields;
				if(modifications.addFields){
					for(var fieldSettings of modifications.addFields){
						var field=fieldSettings.field;
						arrayNewFields.push(field);
					}
				}
				//Так сделали, чтобы копии данных сделать (изоляция от внешних)
				this.#arrayFields=JSON.parse(JSON.stringify(arrayNewFields));
				this.#objectFields=createObjectOfFields(this.#arrayFields);
			}
			if(this.#arrayFields.length>maxFieldsCountInStorage) throw Error(`Storage cant store more then ${maxFieldsCountInStorage} fields`);
			//Задайте отступы для каждого поля в зависимости от длины байт
			var offset=0;
			for(var field of this.#arrayFields){
				field.offset=offset;
				if(this.#minimizeBytesToBoolFields===false){
					//Если не указано минимизировать поля с bool типом
					offset+=getByteSizeOfFieldType(field.type, this.#allowSpecialDataViewTypes);
				} else {
					//Если указано минимизировать поля bool
					if(field.type!=="Bool"){
						offset+=getByteSizeOfFieldType(field.type, this.#allowSpecialDataViewTypes);
					} else {
						if(this.#arrayFieldsBoolTypes===null) this.#arrayFieldsBoolTypes=[];
						this.#arrayFieldsBoolTypes.push(field);
					}
				}
			}
			this.#byteSizeOneRecord=offset;
			if(this.#minimizeBytesToBoolFields){
				//Если указано минимизировать поля bool
				//Перезадайте отступы для каждого поля
				if(this.#arrayFieldsBoolTypes){
					for(var i=0, max=this.#arrayFieldsBoolTypes.length; i<max; ++i){
						var field=this.#arrayFieldsBoolTypes[i];
						field.offset=this.#byteSizeOneRecord+(Math.floor(i/8));
					}
					//Добавьте байт под биты
					this.#byteSizeOneRecord+=Math.ceil(this.#arrayFieldsBoolTypes.length/8);
				}
			}
			//Установите null в кеш
			this.#setCacheRecordAboutValue(null, 0);
			//Создайте кеш для каждого поля хранилища
			//Также добавьте поля в массивы по их типу: уникальных | любых значений
			for(var i=0, maxI=this.#arrayFields.length; (i<maxI); ++i){
				var field=this.#arrayFields[i];
				if(field.isFieldUniqueValues){
					if(this.#arrayFieldsUniqueValues===null) this.#arrayFieldsUniqueValues=[];
					this.#arrayFieldsUniqueValues.push(field);
					if(this.#cacheFieldsUniqueValues===null) this.#cacheFieldsUniqueValues={};
					this.#cacheFieldsUniqueValues[field.name]=new Map();
				} else {
					if(this.#arrayFieldsAnyValues===null) this.#arrayFieldsAnyValues=[];
					this.#arrayFieldsAnyValues.push(field);
					if(this.#cacheFieldsAnyValues===null) this.#cacheFieldsAnyValues={}
					this.#cacheFieldsAnyValues[field.name]=new Map();
				}
			}
			//Сделайте буффер и вью для него
			this.#arrayBuffer=new ArrayBuffer(this.#allocatedRecords*this.#byteSizeOneRecord, {
				maxByteLength: this.#byteSizeOneRecord*(this.#allocatedRecords+this.#recordsCountForAdditionInReallocation)
			});
			this.#dataView=this.#allowSpecialDataViewTypes?new InnerExtendedDataView(this.#arrayBuffer):new DataView(this.#arrayBuffer);
		}
		//Установить индекс последнего поля уникальных значений
		for(var i=0, max=this.#arrayFields.length; i<max; ++i){
			var field=this.#arrayFields[i];
			if(field.isFieldUniqueValues) this.#indexLastFieldUniqueValues=i;
		}
		if(this.#arrayFields===null) this.#arrayFields=[];
		if(this.#arrayFieldsAnyValues===null) this.#arrayFieldsAnyValues=[];
		if(this.#arrayFieldsUniqueValues===null) this.#arrayFieldsUniqueValues=[];
		this.#objectForAddRecordByArgs=new Array(this.#arrayFields.length);
		this.#additionalDataForCheckValue={
			numberOutRange:this.#numberOutRange,
			stringEncoding:this.#stringEncoding
		};
		this.#additionalDataForGetSetMethods={
			arrayFieldsBoolType: this.#arrayFieldsBoolTypes,
			littleEndian: this.#littleEndian,
			mapPointerToSpecificValue: this.#mapPointerToSpecificValue,
			mapSpecificValueToPointer: this.#mapSpecificValueToPointer,
			minimizeBytesToBoolFields: this.#minimizeBytesToBoolFields,
			setCacheRecordAboutValue: this.#setCacheRecordAboutValue.bind(this)
		};
		if(!objectSettings.arrayBuffer){
			//Если создаем хранилище, а не делаем бекап
			for(var value of this.#arrayFuncsForSpecialPropsStorage){
				value.onCreation.call(this);
			}
		} else {
			//В случае, если это бекап
			//Делаем общие вещи
			this.#currentRecords=objectSettings.currentRecords;
			var dataViewOnOldBuffer=this.#allowSpecialDataViewTypes?new InnerExtendedDataView(objectSettings.arrayBuffer):new DataView(objectSettings.arrayBuffer);
			var oldByteSizeOneRecord=objectSettings.byteSizeOneRecord;
			var littleEndian=this.#littleEndian;
			//Установите кол-во байт под указатели
			this.#countBytesForPointerInBufferOfValues=objectSettings.levelSize;
			//Установите на каком кол-во данных попытаться расширяться
			this.#countRecordsForGrowPointerByteSize=getCountRecordsForGrowPointer(this.#countBytesForPointerInBufferOfValues);
			/** 
			 * Создаем объект, сохраняем в него старые данные:
			 * * Байт на запись (старого буффера)
			 * * DataView на старый буффер
			 * * Массив boolean полей старых (создаем такой, если надо минимизировать память под них)
			 * @type {oldDataStorageForGetter} */
			var oldData={
				oldByteSizeOneRecord: oldByteSizeOneRecord,
				dataViewOnOldBuffer: dataViewOnOldBuffer,
				oldArrayFieldsBoolType:(this.#minimizeBytesToBoolFields?([...objectSettings.arrayFields].filter(elem=>elem.type==="Bool")):null)
			};
			//Получите и вставьте кеш из старого буффера
			/** 
			 * Объект для переиспользования в функциях работающих по UTF-8
			 * @type {UTF8ValueObjectInformation} 
			 */
			var objectForUTF8={code:0, length:0};
			//Обработка буффера значений проходит в два этапа-цикла
			{
				//1 - Получите все pointers и создайте под них нужные данные (например объекты определенного типа)
				for(var i=oldByteSizeOneRecord*this.#allocatedRecords, maxI=dataViewOnOldBuffer.byteLength; i<maxI;){
					//Получить тип значения
					var codeTypeOfValue=dataViewOnOldBuffer.getUint8(i);
					i+=1;
					//Получить значение указателя
					var pointer=this.#getPointerInBuffer(dataViewOnOldBuffer, objectSettings.levelSize, i);
					i+=objectSettings.levelSize;
					//Создайте данное (учитывайте только его тип и возможный подкласс)
					//Мы проходимся только по значениям, здесь не лезем во внутренние структуры
					switch(codeTypeOfValue){
						//В случае если данные - строка
						case getNumberCodeFromTypeDB("String"):
							//Length значения
							getUTF8valueInfo(dataViewOnOldBuffer, i, objectForUTF8);
							var length=objectForUTF8.code;
							i+=objectForUTF8.length;
							//get value
							var value="";
							var lengthValue=i+length;
							switch(this.#stringEncoding){
								case "UTF-8":
									for(i, lengthValue; i<lengthValue; ){
										getUTF8valueInfo(dataViewOnOldBuffer, i, objectForUTF8);
										value+=String.fromCodePoint(objectForUTF8.code);
										i+=objectForUTF8.length;
									}
									break;
								case "UTF-16":
									for(i, lengthValue; i<lengthValue; ){
										value+=String.fromCharCode(dataViewOnOldBuffer.getUint16(i, littleEndian));
										i+=2;
									}
									break;
							}
							this.#setCacheRecordAboutValue(value, pointer);
							break;
						case getNumberCodeFromTypeDB("Null"):
							this.#setCacheRecordAboutValue(null, pointer);
							break;
						case getNumberCodeFromTypeDB("DynamicStructure"):
							//Length значения
							getUTF8valueInfo(dataViewOnOldBuffer, i, objectForUTF8);
							var length=objectForUTF8.code;
							i+=objectForUTF8.length;
							i+=length;
							this.#setCacheRecordAboutValue(this.#createObjectDynamicStructure(), pointer);
							break;
						case getNumberCodeFromTypeDB("Array"):
							//Length значения
							getUTF8valueInfo(dataViewOnOldBuffer, i, objectForUTF8);
							var length=objectForUTF8.code;
							i+=objectForUTF8.length;
							i+=length;
							this.#setCacheRecordAboutValue(this.#createArrayForStorage(), pointer);
							break;
						default: throw Error("Unknown type "+codeTypeOfValue);
					}
				}
				//2 - Запускаем цикл по проходу по всем байтам старого буффера
				//Этот шаг уже восстанавливает данные структур
				var objectResultForGetValuesInStructure={fullLength:0, value:null};
				for(var i=oldByteSizeOneRecord*this.#allocatedRecords, maxI=dataViewOnOldBuffer.byteLength; i<maxI;){
					//Получить тип значения
					var codeTypeOfValue=dataViewOnOldBuffer.getUint8(i);
					i+=1;
					//Получить значение указателя
					var pointer=this.#getPointerInBuffer(dataViewOnOldBuffer, objectSettings.levelSize, i);
					i+=objectSettings.levelSize;
					//Получить значение по его типу
					switch(codeTypeOfValue){
						//В случае строки - просто сместиться (создали ее в первом этапе)
						case getNumberCodeFromTypeDB("String"):
							//Length значения
							getUTF8valueInfo(dataViewOnOldBuffer, i, objectForUTF8);
							i+=objectForUTF8.length+objectForUTF8.code;
							break;
						//Для случая если данные типа Object (ObjectDynamicStructure)
						case getNumberCodeFromTypeDB("DynamicStructure"):
							//Получите созданную (в первом цикле) структуру
							var valueStructure=this.#mapPointerToSpecificValue.get(pointer);
							//Length значения
							getUTF8valueInfo(dataViewOnOldBuffer, i, objectForUTF8);
							var lengthObject=objectForUTF8.code;
							i+=objectForUTF8.length;
							//Получить смещение до конца данных объекта
							var end=i+lengthObject;
							for(; i<end; ){
								var pointerForKeyInObject=this.#getPointerInBuffer(dataViewOnOldBuffer, this.#countBytesForPointerInBufferOfValues, i);
								var key=this.#mapPointerToSpecificValue.get(pointerForKeyInObject);
								i+=this.#countBytesForPointerInBufferOfValues;
								this.#getValueFromStructureOfBuffer(dataViewOnOldBuffer, i, objectResultForGetValuesInStructure);
								i+=objectResultForGetValuesInStructure.fullLength;
								valueStructure.set(key, objectResultForGetValuesInStructure.value);
							}
							break;
						case getNumberCodeFromTypeDB("Array"):
							//Получите созданную (в первом цикле) структуру
							var valueStructure=this.#mapPointerToSpecificValue.get(pointer);
							//Length значения
							getUTF8valueInfo(dataViewOnOldBuffer, i, objectForUTF8);
							var lengthObject=objectForUTF8.code;
							i+=objectForUTF8.length;
							//Получить смещение до конца данных объекта
							var end=i+lengthObject;
							for(; i<end; ){
								this.#getValueFromStructureOfBuffer(dataViewOnOldBuffer, i, objectResultForGetValuesInStructure);
								i+=objectResultForGetValuesInStructure.fullLength;
								valueStructure.addElementToEnd(objectResultForGetValuesInStructure.value);
							}
							break;
					}
				}
			}
			//Установить дефолт.значения
			for(var value of this.#arrayFuncsForSpecialPropsStorage){
				value.onBackup.call(this);
			}
			if(!modifications){
				//Если никаких модификаций не было
				var maxIndexRecord=this.#currentRecords;
				this.#replaceDataBufferByBuffer(this.#arrayBuffer, objectSettings.arrayBuffer, this.#currentRecords*this.#byteSizeOneRecord);
				for(var field of this.#arrayFields){
					for(var indexRecord=0; indexRecord<maxIndexRecord; ++indexRecord){
						var value=this.#getValueFromBuffer(indexRecord, field, oldData);
						this.#setValue(indexRecord, field, value, false);
					}
				}
			} else {
				//Если были КАКИЕ УГОДНО модификации
				var modificationDeleteRecords=modifications.deleteRecords?.filter((element,index,arr)=>{
					return (this.#checkIndexRecordValidate(element)==="success" && (arr.indexOf(element)===index))
				}, this);
				if(modificationDeleteRecords){
					//Уменьшите кол-во записей на количество валидных индексов
					this.#currentRecords-=modificationDeleteRecords.length;
				}
				var maxIndexRecord=this.#currentRecords;
				if(!arrayNewFields){
					//Если поля остались без изменений
					//Но учитываем то, что записи могли удалить в модификациях
					for(var field of this.#arrayFields){
						if(modificationDeleteRecords){
							//Если есть массив удаляемых записей
							//indexRecord - запись в старом буффере
							var indexRecord=0;
							for(var indexRecordInNewBuffer=0; indexRecordInNewBuffer<maxIndexRecord; ++indexRecord ){
								if(!modificationDeleteRecords?.includes(indexRecord)){
									var value=this.#getValueFromBuffer(indexRecord, field, oldData);
									this.#setValue(indexRecordInNewBuffer, field, value, false);
									indexRecordInNewBuffer+=1;
								}
							}
						} else {
							for(var indexRecordInNewBuffer=0; indexRecordInNewBuffer<maxIndexRecord; ){
								var value=this.#getValueFromBuffer(indexRecordInNewBuffer, field, oldData);
								this.#setValue(indexRecordInNewBuffer, field, value, false);
								indexRecordInNewBuffer+=1;
							}
						}
					}
				} else {
					//Если изменили поля
					for(var field of this.#arrayFields){
						var indexRecordInNewBuffer=0;
						var newFieldSettings=modifications.addFields?.find(elem=>elem.field.name===field.name);
						if(!newFieldSettings){
							//Если поле старое (НЕ новое)
							var oldField=objectSettings.objectFields[field.name];
							if(modificationDeleteRecords){
								//Если есть массив удаляемых записей
								//indexRecord - запись в старом буффере
								var indexRecord=0;
								for(var indexRecordInNewBuffer=0; indexRecordInNewBuffer<this.#currentRecords; ++indexRecord){
									if(!modificationDeleteRecords.includes(indexRecord)){
										var value=this.#getValueFromBuffer(indexRecord, oldField, oldData);
										this.#setValue(indexRecordInNewBuffer, field, value, false);
										indexRecordInNewBuffer+=1;
									}
								}
							} else {
								//Если нет массива удаляемых записей
								for(var indexRecordInNewBuffer=0; indexRecordInNewBuffer<this.#currentRecords; ){
									var value=this.#getValueFromBuffer(indexRecordInNewBuffer, oldField, oldData);
									this.#setValue(indexRecordInNewBuffer, field, value, false);
									indexRecordInNewBuffer+=1;
								}
								//Циклы одинаковые, просто из этого удаляем проверку
								//Разделили в целях экономии
							}
						} else {
							//Если поле новое
							var newField=this.#objectFields[field.name];
							if(!isObjectHasSelfProperty(newFieldSettings, "typeAddValues") || (newFieldSettings.typeAddValues==="default")){
								//Если новое поле просто указано заполнить дефолт-значениями (по умолчанию мы все равно заполняем его дефолтами)
								for(; indexRecordInNewBuffer<maxIndexRecord; ++indexRecordInNewBuffer){
									var value=getDefaultValueFromFieldDescription(newField);
									this.#setValue(indexRecordInNewBuffer, newField, value, false);
								}
							} else if(newFieldSettings.typeAddValues==="iterator") {
								//Если новое поле указано заполнить итератором
								var maxIndexRecord=this.#currentRecords;
								for(var value of newFieldSettings.values){
									if(indexRecordInNewBuffer>=maxIndexRecord) break;
									if(value===SymbolUseDefaultValue) {
										if(newField.isFieldUniqueValues) throw Error("Fields unique values cant have default values")
										value=getDefaultValueFromFieldDescription(newField);
									}
									var checking=this.#checkValueToPutInFieldWithUnique(indexRecordInNewBuffer, newField, value);
									if(checking!=="success") throw Error("[DataStorage]"+checking);
									this.#setValue(indexRecordInNewBuffer, newField, value, false);
									indexRecordInNewBuffer+=1;
								}
								if(indexRecordInNewBuffer<maxIndexRecord){
									//Если итератор не полностью заполнил хранилище
									//Если это было поле уникальных значений, то выбросьте ошибку
									if(field.isFieldUniqueValues) throw Error("Field Unique Values must have all values");
									//Остатки заполните дефол.значением
									for(indexRecordInNewBuffer; indexRecordInNewBuffer<maxIndexRecord; ++indexRecordInNewBuffer){
										var value=getDefaultValueFromFieldDescription(newField);
										this.#setValue(indexRecordInNewBuffer, newField, value, false)
									}
								}
							}
						}
					}
				}
				this.#callPointersValidate();
			}
		}
		if(this.#allocatedRecords===0) this.#callbackAllocation.call(this, this.#currentRecords);
	}
	/**
	 * Выделяет память под новые записи  
	 * Возвращает новое количество записей на которых выделена память  
	 * @param {number} countRecords 
	 */
	allocateMemoryForRecords(countRecords){
		if(!isValueIsPositiveInteger(countRecords)) throw Error("[allocateMemoryForRecords] 1arg is 'countRecords' must be positive integer");
		if(this.#arrayBuffer.resizable && ((this.#arrayBuffer.byteLength+(countRecords*this.#byteSizeOneRecord))<=this.#arrayBuffer.maxByteLength)){
			this.#arrayBuffer.resize(this.#arrayBuffer.byteLength+countRecords*this.#byteSizeOneRecord);
		} else {
			var oldBuffer=this.#arrayBuffer;
			var newByteLength=this.#arrayBuffer.byteLength+countRecords*this.#byteSizeOneRecord;
			this.#arrayBuffer=new ArrayBuffer(newByteLength, {
				maxByteLength:newByteLength+this.#recordsCountForAdditionInReallocation*this.#byteSizeOneRecord
			});
			this.#replaceDataBufferByBuffer(this.#arrayBuffer, oldBuffer)
		}
		this.#dataView=this.#allowSpecialDataViewTypes?new InnerExtendedDataView(this.#arrayBuffer):new DataView(this.#arrayBuffer);
		return this.#allocatedRecords+=countRecords;
	}
	/**
	 * Объект для работы addRecordByArgs  
	 * Обязательно свяжите это свойство в конструкторе этого класса с массивом длиной полей
	 */
	#objectForAddRecordByArgs=null;
	/**
	 * Добавить запись, данные будут заполняться по схеме: индекс аргумента - индекс поля
	 * @param  {...JStypesToDBValue} values 
	 */
	addRecordByArgs(...values){
		if(this.#currentRecords===this.#allocatedRecords) throw Error("[addRecordByArgs] Do allocate memory for new records");
		//Проверить есть ли все поля уникальных значений
		if((this.#indexLastFieldUniqueValues>(-1)) && (values.length<=this.#indexLastFieldUniqueValues)) throw Error(`[addRecordByArgs] Fields Unique Values must has value`);
		//Мутируйте объект для работы с этим методом
		var copyValues=this.#objectForAddRecordByArgs;
		Object.assign(copyValues, values);
		for(var i=values.length, max=this.#arrayFields.length; i<max; ++i){
			copyValues[i]=getDefaultValueFromFieldDescription(this.#arrayFields[i]);
		}
		//Проверить все значения
		for(var i=0, max=this.#arrayFields.length; i<max; ++i){
			var field=this.#arrayFields[i];
			//Валидация значения (до проверок)
			copyValues[i]=this.#validateValue(field, copyValues[i])
			var value=copyValues[i];
			var checking=this.#checkValueToPutInFieldWithUnique(this.#currentRecords, field, value);
			if(checking!=="success") throw Error("[addRecordByArgs] "+checking);
		}
		//adding values
		this.#addRecordByArgs(...copyValues);
		return this;
	}
	#objectForAddRecordByObject={};
	/**
	 * Добавить запись, задать ее данные по данным из объекта, где ключ - имя поля, значение - данные
	 * @param  {Record<string, JStypesToDBValue>} objectData
	 */
	addRecordByObject(objectData){
		if(this.#currentRecords===this.#allocatedRecords) throw Error("[addRecordByObject] Do allocate memory for new records");
		if(this.#arrayFieldsUniqueValues.length){
			var i=0; 
			for(var stringPropName of Object.keys(objectData)){
				var field=this.#objectFields[stringPropName];
				if(field?.isFieldUniqueValues) ++i;
			}
			if(i!==this.#arrayFieldsUniqueValues.length) throw Error("[addRecordByObject] All fields unique values must have values");
		}
		var copyObject=Object.assign(this.#objectForAddRecordByObject, objectData);
		//Можем не удалять лишние ключи в копии объекта, так как мы проходимся все равно по всем полям и получаем их default значения
		for(var fieldAnyValues of this.#arrayFieldsAnyValues){
			if(!isObjectHasSelfProperty(objectData, fieldAnyValues.name)) copyObject[fieldAnyValues.name]=getDefaultValueFromFieldDescription(fieldAnyValues);
		}
		//Валидация и проверка значения
		for(var stringPropName of Object.keys(copyObject)){
			var field=this.#objectFields[stringPropName];
			if(field){
				//Валидация значения
				copyObject[stringPropName]=this.#validateValue(field, copyObject[stringPropName]);
				var value=copyObject[stringPropName];
				//Проверка значения
				var checking=this.#checkValueToPutInFieldWithUnique(this.#currentRecords, field, value);
				if(checking!=="success") throw Error("[addRecordByObject] "+checking);
			}
		}
		//adding values
		this.#addRecordByObject(copyObject);
		return this;
	}
	/**
	 * Возвращает объект-указатель, методы которого обращены к конкретному полю конкретной записи  
	 * Выгоден при частых обращениях к одному и тому же полю конкретной записи
	 * @param {number} indexRecord 
	 * @param {string} fieldName 
	 * @returns {DBCursorToFieldByIndex}
	 */
	createCursor(indexRecord, fieldName){
		var checking=this.#checkIndexRecordValidate(indexRecord);
		if(checking!=="success") throw Error("[createCursor] "+checking);
		var checking=this.#checkStringIsFieldName(fieldName);
		if(checking!=="success") throw Error("[createCursor] "+checking);
		return new DBCursorToFieldByIndex(this, indexRecord, this.#objectFields[fieldName], this.#getValue, this.#setValue, this.#checkValueToPutInFieldWithUnique);
	}
	/**
	 * Создать объект динамической структуры
	 * @param {ObjectDBRecord} [object] 
	 */
	createObjectDynamicStructure(object){
		return this.#createObjectDynamicStructure(object);
	}
	#createObjectDynamicStructure(object){
		return new ObjectDynamicStructure(this, this.#objectCacheOperations, object);
	}
	/**
	 * Создать массив, хранящий любые элементы
	 * @param {JStypesToDBValue[]} [array] 
	 */
	createArrayForStorage(array){
		return this.#createArrayForStorage(array);
	}
	#createArrayForStorage(array){
		return new ArrayForDataStorage(this, this.#objectCacheOperations, array);
	}
	/**
	 * Получить объект-данные записи в Хранилище  
	 * 1arg - индекс записи
	 * @param {number} indexRecord 
	 * @returns {ObjectDBRecord}
	 */
	getRecordData(indexRecord){
		var checking=this.#checkIndexRecordValidate(indexRecord);
		if(checking!=="success") throw Error('[getRecordData]'+checking);
		return this.#createObjectFromRecord(indexRecord);
	}
	/**
	 * Получить данные в поле по индексу записи
	 * @param {number} indexRecord 
	 * @param {string} fieldName 
	 */
	getRecordDataFromField(indexRecord, fieldName){
		var checking=this.#checkIndexRecordValidate(indexRecord);
		if(checking!=="success") throw Error('[getRecordDataFromField]'+checking);
		var checking=this.#checkStringIsFieldName(fieldName);
		if(checking!=="success") throw Error("[getRecordDataFromField] "+checking);
		var field=this.#objectFields[fieldName];
		return this.#getValue(indexRecord, field);
	}
	/**
	 * Мутировать объект данными из записи в Хранилище  
	 * В объект будут вписаны данные по принципу: ключ - имя поля, значение - данные
	 * 1arg - индекс записи  
	 * 2arg - объект, который будет мутировать метод
	 * @param {number} indexRecord 
	 * @param {Object} target 
	 * @returns {ObjectDBRecord}
	 */
	getRecordDataToObject(indexRecord, target){
		var checking=this.#checkIndexRecordValidate(indexRecord);
		if(checking!=="success") throw Error('[getRecordDataToObject]'+checking);
		if((typeof target!=="object") || (target===null)) throw Error("[getRecordDataToObject] 'target' must be object (not a null)");
		if(indexRecord>=this.#currentRecords) throw Error("[getRecordDataToObject] 'indexRecord' cant be more than current records count");
		return this.#mutateObjectByRecord(indexRecord, target);
	}
	/**
	 * Мутировать объект Map данными из записи в Хранилище  
	 * В объект Map будут вписаны данные (через метод set) по принципу: ключ - имя поля, значение - данные
	 * 1arg - индекс записи  
	 * 2arg - объект-Map, который будет мутировать метод
	 * @param {number} indexRecord 
	 * @param {Map} target 
	 * @returns {MapObjectDBRecord}
	 */
	getRecordDataToMap(indexRecord, target){
		var checking=this.#checkIndexRecordValidate(indexRecord);
		if(checking!=="success") throw Error('[getRecordDataToMap]'+checking);
		if((typeof target!=="object") || !(target instanceof Map)) throw Error("[getRecordDataToMap] 'target' must be Map object");
		if(indexRecord>=this.#currentRecords) throw Error("[getRecordDataToMap] 'indexRecord' cant be more than current records count");
		return this.#mutateMapByRecord(indexRecord, target);
	}
	/**
	 * Получить массив с объектами-данными записей в Хранилище  
	 * 1arg - индекс записи с какой начать  
	 * 2arg - индекс записи до которой идти (не включительно)
	 * @param {number} [indexFrom] 
	 * @param {number} [indexTo] 
	 * @returns {ObjectDBRecord[]}
	 */
	getRecordsData(indexFrom=0, indexTo=this.#currentRecords){
		var checking=this.#checkIndexFromAndToValidate(indexFrom, indexTo);
		if(checking!=="success") throw Error("[getRecordsData] "+checking)
		var resultArray=new Array(indexTo-indexFrom);
		for(var indexRecord=indexFrom, indexResultArray=0; (indexRecord<indexTo); ++indexRecord, ++indexResultArray){
			var objectRecord=this.#createObjectFromRecord(indexRecord);
			resultArray[indexResultArray]=objectRecord;
		}
		return resultArray;
	}
	/**
	 * Возвращает кол-во записей в Хранилище на момент вызова метода
	 * @returns {number}
	 */
	getRecordsCount(){
		return this.#currentRecords;
	}
	get header(){
		return this.#header;
	}
	/**
	 * @typedef {{
	 *   currentRecords:number,
	 *   allocatedRecords:number,
	 *   byteSizeOneRecord:number,
	 *   usedMemoryForBaseBuffer:number,
	 *   usedMemoryForAllData:number,
	 *   fields:ArrayDBFields,
	 *   stringEncoding:DataStorageStringEncodingTypes,
	 *   numberOutRange:DataStorageSettingNumberToRange
	 *   littleEndian:boolean,
	 *   minimizeBytesToBoolFields:boolean
	 *   allowSpecialDataViewTypes:boolean
	 *   levelSize:number
	 * }} ObjectDataStorageInfo
	 */
	/**
	 * Получить объект с некоторыми данными Хранилища по типу: максимум записей, на сколько записей выделена память и тд  
	 * Метод необходим при сохранении данных Хранилища в файлы, так как через данные из этого метода буффер можно восстановить
	 * @returns {ObjectDataStorageInfo}
	 */
	getInfo(){
		return this.#getInfo();
	}
	getInfoInJSON(){
		return JSON.stringify(this.#getInfo());
	}
	/**
	 * Возвращает при каждом вызове новый объект
	 * @returns {ObjectDataStorageInfo}
	 */
	#getInfo(){
		var bytesAll=this.#getCountBytesForAllData();
		return {
			currentRecords:this.#currentRecords,
			allocatedRecords:this.#allocatedRecords,
			byteSizeOneRecord:this.#byteSizeOneRecord,
			usedMemoryForBaseBuffer:this.#arrayBuffer.byteLength,
			usedMemoryForAllData:bytesAll,
			fields:this.#arrayFields.map(elem=>({...elem})),
			stringEncoding:this.#stringEncoding,
			numberOutRange:this.#numberOutRange,
			littleEndian:this.#littleEndian,
			minimizeBytesToBoolFields:this.#minimizeBytesToBoolFields,
			allowSpecialDataViewTypes:this.#allowSpecialDataViewTypes,
			levelSize:this.#countBytesForPointerInBufferOfValues
		}
	}
	/**
	 * Возвращает число - длину байт буффера  
	 * Аргумент принимает одну из строк:
	 * * "allbuffer" - буффер + длина всех кешируемых данных (вызывает очистку ссылок)  
	 * * "basebuffer" - длину основного буфера (не идет подсчет длины кешированных данных)  
	 * * "record" - кол-во байт на запись  
	 * 
	 * По умолчанию - basebuffer
	 * @param {"allbuffer" | "basebuffer" | "record"} [typeCalculation]
	 */
	getByteLength(typeCalculation){
		var result=0;
		switch(typeCalculation){
			case "allbuffer":
				result=this.#getCountBytesForAllData();
				break;
			case "record":
				result=this.#byteSizeOneRecord;
				break;
			case "basebuffer":
				result=this.#arrayBuffer.byteLength;
				break;
			default:
				if(typeCalculation==null) result=this.#arrayBuffer.byteLength;
				else throw Error("[getByteLength] invalid arg");
				break;
		}
		return result;
	}
	#getCountBytesForAllData(){
		//Вызвать очистку ссылок
		this.#callPointersValidate();
		//Схема в начале файла
		var result=this.#arrayBuffer.byteLength;
		if(this.#mapPointerToSpecificValue){
			var byteLengthPointers=this.#mapPointerToSpecificValue.size*this.#countBytesForPointerInBufferOfValues;
			var byteLengthLengthValue=0;
			var byteLengthTypeValue=this.#mapPointerToSpecificValue.size*1;
			var byteLengthValueData=0;
			for(var value of this.#mapPointerToSpecificValue.values()){
				switch(typeof value){
					case "string":
						switch(this.#stringEncoding){
							case "UTF-8":
								var lengthOfStringInUTF8=getLengthForStringInUTF8(value);
								byteLengthLengthValue+=getUTF8valueLength(lengthOfStringInUTF8);
								byteLengthValueData+=lengthOfStringInUTF8;
								break;
							case "UTF-16":
								byteLengthLengthValue+=(getUTF8valueLength(value.length*2));
								byteLengthValueData+=value.length*2;
								break;
						}
						break;
					case "object":
						if(value!==null){
							var lengthObject=this.#getByteLengthOfObject(value);
							var bytesLength=getUTF8valueLength(lengthObject)
							byteLengthLengthValue+=bytesLength;
							byteLengthValueData+=lengthObject;
						}
						break;
				}
			}
			var addBytes=(byteLengthPointers+byteLengthTypeValue+byteLengthLengthValue+byteLengthValueData);
			result+=addBytes;
		}
		return result;
	}
	/**
	 * Возвращает копию буффера со всеми данными  
	 * Используйте для сохранения данных в файлы
	 * @returns {ArrayBuffer}
	 */
	getBuffer(){
		return this.#getBuffer();
	}
	/**
	 * Возвращает копию буффера со всеми данными  
	 * Используйте для сохранения данных в файлы  
	 * 
	 * Метод приватный, чтобы не изменяли извне
	 * @returns {ArrayBuffer}
	 */
	#getBuffer(){
		if(this.#mapPointerToSpecificValue){
			var result=new ArrayBuffer(this.#getCountBytesForAllData());
			var dataview=new DataView(result);
			this.#replaceDataBufferByBuffer(result, this.#arrayBuffer);
			var offset=this.#arrayBuffer.byteLength;
			var littleEndian=this.#littleEndian;
			var objectForUTF8={length:0};
			for(var pointer of this.#mapPointerToSpecificValue.keys()){
				var value=this.#mapPointerToSpecificValue.get(pointer);
				switch(typeof value){
					case "string":
						//type
						dataview.setUint8(offset, getNumberCodeFromTypeDB("String"));
						offset+=1;
						//pointer
						this.#setPointerInBuffer(dataview, this.#countBytesForPointerInBufferOfValues, offset, pointer);
						offset+=this.#countBytesForPointerInBufferOfValues;
						switch(this.#stringEncoding){
							case "UTF-8":
								//length data
								objectForUTF8=setUTF8value(dataview, offset, getLengthForStringInUTF8(value), objectForUTF8);
								offset+=objectForUTF8.length;
								//put value
								for(var codePoint of value){
									setUTF8value(dataview, offset, codePoint.codePointAt(0), objectForUTF8);
									offset+=objectForUTF8.length;
								}
								break;
							case "UTF-16":
								//length data
								objectForUTF8=setUTF8value(dataview, offset, value.length*2, objectForUTF8);
								offset+=objectForUTF8.length;
								//put value
								for(var i=0; i<value.length; ++i){
									dataview.setUint16(offset, value.charCodeAt(i), littleEndian);
									offset+=2;
								}
								break;
						}
						break;
					case "object":
						//type
						var createdFrom=getInitialObjectOfStructureForStorage(value);
						dataview.setUint8(
							offset,
							value ?
									(createdFrom===ObjectDynamicStructure && getNumberCodeFromTypeDB("DynamicStructure")) ||
									(createdFrom===ArrayForDataStorage && getNumberCodeFromTypeDB("Array"))
								: getNumberCodeFromTypeDB("Null")
						);
						offset+=1;
						//pointer
						this.#setPointerInBuffer(dataview, this.#countBytesForPointerInBufferOfValues, offset, pointer);
						offset+=this.#countBytesForPointerInBufferOfValues;
						//value
						if(value!==null){
							//Длина всей структуры
							setUTF8value(dataview, offset, this.#getByteLengthOfObject(value), objectForUTF8);
							offset+=objectForUTF8.length;
							switch(true){
								case (value instanceof ObjectDynamicStructure):
									for(var key of value.keys()){
										//key
										this.#setPointerInBuffer(dataview, this.#countBytesForPointerInBufferOfValues, offset, this.#mapSpecificValueToPointer.get(key));
										offset+=this.#countBytesForPointerInBufferOfValues;
										//value in key
										var valueOfProp=value.get(key);
										offset+=this.#setValueFromStructureToBuffer(dataview, offset, valueOfProp);
									}
									break;
								case (value instanceof ArrayForDataStorage):
									for(var element of value.values()){
										offset+=this.#setValueFromStructureToBuffer(dataview, offset, element);
									}
									break;
							}
						}
						break;
				}
			}
		} else {
			var result=this.#arrayBuffer.slice();
		}
		return result;
	}
	/**
	 * Возвращает строку из codePoint, каждый из которых будет байтом буффера
	 * @returns {string}
	 */
	getStringFromBuffer(){
		var result="";
		var strconstruct=String;
		for(var byte of new Uint8Array(this.getBuffer())) result+=strconstruct.fromCharCode(byte);
		return result;
	}
	/**
	 * Задать данные поля записи по индексу
	 * @param {number} indexRecord 
	 * @param {string} fieldName 
	 * @param {JStypesToDBValue} value 
	 */
	setRecordDataOfField(indexRecord, fieldName, value){
		var startStringOfError="[setRecordDataOfField] ";
		var checking=this.#checkIndexRecordValidate(indexRecord);
		if(checking!=="success") throw Error(startStringOfError+checking);
		checking=this.#checkStringIsFieldName(fieldName);
		if(checking!=="success") throw Error(startStringOfError+checking);
		var field=this.#objectFields[fieldName];
		value=this.#validateValue(field, value);
		checking=this.#checkValueToPutInFieldWithUnique(indexRecord, field, value);
		if(checking!=="success") throw Error(startStringOfError+checking);
		this.#setValue(indexRecord, field, value);
	}
	/**
	 * Задать данные в записи по ее индексу  
	 * Передайте в аргумент объект, в котором ключ - имя поля, значение - данные  
	 * @example
	 * var myStorage=new DataStorage()
	 *   .addFieldUniqueValues("id", "Float64")
	 *   .addFieldAnyValues("money", "Uint32")
	 *   .setCallbackAllocation(function(){
	 *       this.allocateMemoryForRecords(100);
	 *   })
	 *   .endCreation();
	 * myStorage.addRecordByArgs(-1234567890, 0);
	 * myStorage.setRecordDataByObject(0, {money: 1500});
	 * //Запись 0 будет иметь данные: {id: -1234567890, money: 1500}
	 * @param {number} indexRecord 
	 * @param {ObjectDBRecord} objectData 
	 */
	setRecordDataByObject(indexRecord, objectData){
		var checking=this.#checkIndexRecordValidate(indexRecord);
		if(checking!=="success") throw Error('[setDataOfRecordByObject]'+checking);
		var keys=Object.keys(objectData);
		var copyObject=Object.assign({}, objectData);
		//Валидируйте значения передаваемые
		for(var key of keys){
			var field=this.#objectFields[key];
			if(field){
				copyObject[key]=this.#validateValue(field, copyObject[key]);
			}
		}
		for(var stringPropName of keys){
			//Проверяем все поля указанные в объекте на валидность
			var field=this.#objectFields[stringPropName];
			if(field){
				var checking=this.#checkValueToPutInFieldWithUnique(indexRecord, field, copyObject[stringPropName]);
				if(checking!=="success") throw Error("[setDataOfRecordByObject] "+checking);
			}
		}
		for(var stringPropName of keys){
			var field=this.#objectFields[stringPropName];
			if(field) this.#setValue(indexRecord, field, copyObject[stringPropName]);
		}
	}
	/**
	 * 
	 * @param {number} count 
	 */
	setRecordsCountForAdditionInReallocation(count){
		if(!isValueIsPositiveInteger(count)) throw Error("[setRecordsCountForAdditionInReallocation] arg 'count' must be positive integer");
		this.#recordsCountForAdditionInReallocation=count;
	}
	/**
	 * Найти индекс записи в Хранилище у которой данные полей равны данным из объекта
	 * @param {ObjectDBRecord} objectData 
	 * @param {number} [indexFrom] 
	 * @param {number} [indexTo] 
	 */
	findIndexRecordWithValuesByObject(objectData, indexFrom=0, indexTo=this.#currentRecords){
		//Проверьте указанные индексы на валидность
		var checking=this.#checkIndexFromAndToValidate(indexFrom, indexTo);
		if(checking!=="success") throw Error("[findIndexRecordWithValuesByObject] "+checking);
		var keys=Object.keys(objectData);
		var result=-1;
		for(var stringPropName of keys){
			//Проходим по полям уникальных значений
			var field=this.#objectFields[stringPropName];
			var value=objectData[stringPropName];
			if(field && field.isFieldUniqueValues){
				//Если поле такое указано в объекте
				//Если найдена запись
				if(this.#cacheFieldsUniqueValues[stringPropName].has(value)){
					if(result===-1){
						result=this.#cacheFieldsUniqueValues[stringPropName].get(value);
					} else {
						//Если найденный индекс отличается
						if(result!==this.#cacheFieldsUniqueValues[stringPropName].get(value)) return -1;
					}
				} else return -1;
			}
		}
		if(result!==-1){
			//Если нашлась запись у которой данные соотвествуют данным полей уникальных значений
			//Пройтись по полям любых значений, сравнить их данные
			for(var stringPropName of keys){
				var field=this.#objectFields[stringPropName];
				if(field && (!field.isFieldUniqueValues)){
					var value=objectData[stringPropName];
					var valueWhatWithNeedEqual=this.#getValue(result, field);
					if(value!==valueWhatWithNeedEqual) return -1;
				}
			}
			return this.#isIndexInRange(result, indexFrom, indexTo)?result:-1;
		} else {
			//В случае, если не найдено полей уникальных значений
			var set=new Set();
			var gettedFirst=false;
			var keys=Object.keys(objectData);
			for(var stringPropName of keys){
				var field=this.#objectFields[stringPropName];
				if(field && (field.isFieldUniqueValues===false)){
					var value=objectData[stringPropName];
					if(!this.#cacheFieldsAnyValues[field.name].has(value)) return -1;
					var cache=this.#cacheFieldsAnyValues[field.name].get(value);
					if(gettedFirst===false) {
						//В первом поле любых значений, указанном в объекте, мы заполним коллекцию ее индексами
						for(var index of cache) set.add(index);
						gettedFirst=true;
					} else {
						//В остальных полях любых значений, удаляем из коллекции те индексы, которых нет в кеше этого поля
						for(var index of set){
							if(!cache.has(index)) set.delete(index);
							if(set.size===0) return -1;
						}
					}
				}
			}
			//После прохода по всем полям любых значений:
			//Мы проверяем каждый индекс коллекции на "входит ли он в указанный диапазон" и возвращаем первый, удовлетворяющий проверку
			for(var index of set){
				if(this.#isIndexInRange(index, indexFrom, indexTo)) return index;
			}
			return -1;
		}
		return -1;
	}
	/**
	 * Найти индексы записей в Хранилище у которой данные полей равны данным из объекта
	 * Результат будет в виде массива с индексами (если нет записей соотвествующих, то массив будет с length = 0)
	 * @param {ObjectDBRecord} objectData 
	 * @param {number} [indexFrom] 
	 * @param {number} [indexTo] 
	 */
	findIndexesRecordsWithValuesByObject(objectData, indexFrom=0, indexTo=this.#currentRecords){
		//Проверьте валидность указанных индексов
		var checking=this.#checkIndexFromAndToValidate(indexFrom, indexTo);
		if(checking!=="success") throw Error("[findIndexRecordWithValuesByObject] "+checking)
		var indexRecordValid=-1;
		var keys=Object.keys(objectData);
		for(var stringPropName of keys){
			//Проходим по полям уникальных значений
			var field=this.#objectFields[stringPropName];
			var value=objectData[stringPropName];
			if(field && field.isFieldUniqueValues){
				if(this.#cacheFieldsUniqueValues[stringPropName].has(value)){
					if(indexRecordValid===-1){
						indexRecordValid=this.#cacheFieldsUniqueValues[stringPropName].get(value);
					} else {
						//Если найденный индекс отличается
						if(indexRecordValid!==this.#cacheFieldsUniqueValues[stringPropName].get(value)) return [];
					}
				} else return [];
			}
		}
		if(indexRecordValid!==-1){
			//Если нашлась запись у которой данные соотвествуют данным полей уникальных значений
			//Пройтись по полям любых значений, сравнить их данные
			for(var stringPropName of keys){
				var field=this.#objectFields[stringPropName];
				if(field && (!field.isFieldUniqueValues)){
					var value=objectData[stringPropName];
					var equalWith=this.#getValue(indexRecordValid, field);
					if(value!==equalWith) return [];
				}
			}
			if(this.#isIndexInRange(indexRecordValid, indexFrom, indexTo)) return [indexRecordValid];
			else return [];
		} else {
			//В случае, если не найдено полей уникальных значений
			/** @type {Set<number>} */
			var set=new Set();
			var gettedFirst=false;
			for(var stringPropName of keys){
				var field=this.#objectFields[stringPropName];
				if(field && (!field.isFieldUniqueValues)){
					var value=objectData[stringPropName];
					if(!this.#cacheFieldsAnyValues[field.name].has(value)) return [];
					var cache=this.#cacheFieldsAnyValues[field.name].get(value);
					if(!gettedFirst) {
						//В первом поле любых значений, указанном в объекте, мы заполним коллекцию ее индексами
						for(var index of cache) set.add(index);
						gettedFirst=true;
					} else {
						//В остальных полях любых значений, удаляем из коллекции те индексы, которых нет в кеше этого поля
						for(var index of set){
							if(!cache.has(index)) set.delete(index);
							if(set.size===0) return [];
						}
					}
				}
			}
			for(var index of set){
				if(!this.#isIndexInRange(index, indexFrom, indexTo)) set.delete(index);
			}
			return [...set];
		}
		return [];
	}
	/**
	 * @callback FunctionForEveryRecord
	 * @param {ObjectDBRecord} record
	 * @param {number} indexRecord
	*/
	/**
	 * @callback FunctionForEveryRecordForWaitTrueResult
	 * @param {ObjectDBRecord} record
	 * @param {number} indexRecord
	 * @returns {boolean}
	*/
	/**
	 * Вызывает функцию по всем объектам-записям Хранилища  
	 * Метод использует создает один объект и мутирует для каждой итерации (в соображениях экономии)  
	 * Изменения свойств объекта не повлияют на данные в Хранилище  
	 * Во второй аргумент передается объект с возможными следующими свойствами:
	 * * stop - boolean тип, проверяется после каждой итерации (но и один раз перед стартом цикла), когда true, цикл остановится
	 * * everyIterationNewObject - boolean тип, при true на каждую итерацию будет создаваться новый объект
	 * @example 
	 * var object={stop:false};
	 * db.forEach(
	 *   (elem, index)=>{
	 *     console.log(elem);
	 *     if(index===1) object.stop=true; //цикл завершится досрочно
	 *   }, object
	 * );
	 * @param {FunctionForEveryRecord} func 
	 * @param {{stop:boolean, everyIterationNewObject:boolean}} [objectSettings]
	 */
	forEach(func, objectSettings){
		if(objectSettings?.everyIterationNewObject){
			if(!objectSettings.stop){
				for(var i=0, max=this.#currentRecords; i<max; ++i){
					var objectRecord=this.#createObjectFromRecord(i);
					func(objectRecord, i);
					if(objectSettings?.stop) break;
				}
			}
		} else if(!objectSettings?.stop && this.#currentRecords){
			var objectRecord=this.#createObjectFromRecord(0);
			for(var i=0, max=this.#currentRecords; i<max; ++i){
				this.#mutateObjectByRecord(i, objectRecord);
				func(objectRecord, i);
				if(objectSettings?.stop) break;
			}
		}
		return;
	}
	/**
	 * Возвращает индекс записи, при которой функция переданная вернет true, иначе вернет -1  
	 * Во второй аргумент передается объект с возможными следующими свойствами:
	 * * everyIterationNewObject - boolean тип, при true на каждую итерацию будет создаваться новый объект
	 * @param {FunctionForEveryRecordForWaitTrueResult} func 
	 * @param {{everyIterationNewObject:boolean}} [objectSettings]
	 */
	findIndexRecordWithTrueResultOnCallback(func, objectSettings){
		var result=-1;
		if(this.#currentRecords>0){
			if(objectSettings?.everyIterationNewObject){
				for(var i=0, max=this.#currentRecords; i<max; ++i){
					var objectRecord=this.#createObjectFromRecord(i);
					if(func(objectRecord, i)) {
						result=i;
						break;
					}
				}
			} else {
				var objectRecord=this.#createObjectFromRecord(0);
				for(var i=0, max=this.#currentRecords; i<max; ++i){
					this.#mutateObjectByRecord(i, objectRecord);
					if(func(objectRecord, i)){
						result=i;
						break;
					}
				}
			}
		}
		return result;
	}
	/**
	 * Добавляет запись и данные  
	 * Вызывает очистку ссылок **только после** установки всех значений в хранилище
	 * @param  {...JStypesToDBValue} values 
	 */
	#addRecordByArgs(...values){
		for(var i=0, max=this.#arrayFields.length; i<max; ++i){
			var value=values[i];
			var field=this.#arrayFields[i];
			this.#setValue(this.#currentRecords, field, value, false);
		}
		this.#currentRecords+=1;
		this.#callReferenceCleanerIfManyValues();
		if(this.#currentRecords===this.#allocatedRecords) this.#callbackAllocation.call(this, this.#currentRecords);
	}
	/**
	 * Добавляет запись и данные, использует default значения  
	 * Не требует Object.keys  
	 * Вызывает очистку ссылок **только после** установки всех значений в хранилище
	 * @param {ObjectDBRecord} objectData
	 */
	#addRecordByObject(objectData){
		for(var i=0, max=this.#arrayFields.length; i<max; ++i){
			var field=this.#arrayFields[i];
			var fieldName=this.#arrayFields[i].name;
			var value=objectData[fieldName];
			this.#setValue(this.#currentRecords, field, value, false);
		}
		this.#currentRecords+=1;
		this.#callReferenceCleanerIfManyValues();
		if(this.#currentRecords===this.#allocatedRecords) this.#callbackAllocation.call(this, this.#currentRecords);
	}
	/**
	 * Получить значение из Хранилища
	 * @param {number} indexRecord 
	 * @param {DataStorageField} field 
	 * @returns {JStypesToDBValue}
	 */
	#getValue(indexRecord, field){
		var offset=this.#byteSizeOneRecord*indexRecord+field.offset;
		var value=AllTypesForDataStorageField[field.type].getValue(this.#dataView, field, offset, this.#additionalDataForGetSetMethods);
		return value;
	}
	/**
	 * Устанавливает значения в Хранилище, не делая никаких проверок  
	 * 
	 * Важно: 4 аргумент - вызывать ли очистку ссылок, если данных много  
	 * Если false - не вызывать (используется в addRecord методах)  
	 * По умолчанию - вызывать
	 * @param {number} indexRecord 
	 * @param {DataStorageField} field 
	 * @param {JStypesToDBValue} value 
	 * @param {boolean} needCallClear
	 */
	#setValue(indexRecord, field, value, needCallClear=true){
		var offset=this.#byteSizeOneRecord*indexRecord+field.offset;
		//Получаем старое значение
		var needDeleteOldValue=false;
		if(indexRecord<this.#currentRecords){
			if(field.isFieldUniqueValues){
				var oldValue=this.#getValue(indexRecord, field);
				if(this.#cacheFieldsUniqueValues[field.name].get(oldValue)===indexRecord) needDeleteOldValue=true;
			} else {
				var oldValue=this.#getValue(indexRecord, field);
				var cacheOldValue=this.#cacheFieldsAnyValues[field.name].get(oldValue);
				needDeleteOldValue=true;
			}
		}
		//Ставим значение в хранилище
		AllTypesForDataStorageField[field.type].setValue(this.#dataView, field, offset, value, this.#additionalDataForGetSetMethods);
		//Устанавливаем значение в кеш-поля
		//И удаляем старое значение
		if(field.isFieldUniqueValues){
			if(needDeleteOldValue) this.#cacheFieldsUniqueValues[field.name].delete(oldValue);
			this.#cacheFieldsUniqueValues[field.name].set(value, indexRecord);
		} else {
			if(needDeleteOldValue && cacheOldValue){
				cacheOldValue.delete(indexRecord);
				if(cacheOldValue.size===0) this.#cacheFieldsAnyValues[field.name].delete(oldValue);
			}
			var cacheNewValue=this.#cacheFieldsAnyValues[field.name].get(value);
			if(!cacheNewValue){
				cacheNewValue=new Set();
				this.#cacheFieldsAnyValues[field.name].set(value, cacheNewValue);
			}
			cacheNewValue.add(indexRecord);
		}
		if(needCallClear){
			switch(typeof value){
				case "string":
				case "object":
					this.#callReferenceCleanerIfManyValues();
					break;
			}
		}
	}
	/**
	 * @callback DataStorageSetCacheRecordAboutValue
	 * @param {string} value 
	 * @param {number} [pointer] 
	 * @param {boolean} [needCallClear]
	 * @returns {number}
	 */
	/**
	 * Создает запись в кеше (указатель -> значение И значение -> указатель)  
	 * Берет указатель из второго аргумента, иначе генерирует его  
	 * 
	 * Возвращает указатель на данные переданные  
	 * @type {DataStorageSetCacheRecordAboutValue}
	 */
	#setCacheRecordAboutValue(value, pointer){
		if(!this.#mapSpecificValueToPointer.has(value)){
			if(typeof pointer!=="number"){
				while(true){
					if(this.#mapPointerToSpecificValue.has(this.#pointerSpecificValue)){
						if(this.#pointerSpecificValue>=this.#maxPointerSpecificValue) this.#pointerSpecificValue=0;
						else ++this.#pointerSpecificValue;
					} else break;
				}
				this.#mapSpecificValueToPointer.set(value, this.#pointerSpecificValue);
				this.#mapPointerToSpecificValue.set(this.#pointerSpecificValue, value);
				var selectedPointer=this.#pointerSpecificValue;
			} else {
				this.#mapPointerToSpecificValue.set(pointer, value);
				this.#mapSpecificValueToPointer.set(value, pointer);
				var selectedPointer=pointer;
			}
		} else {
			var selectedPointer=this.#mapSpecificValueToPointer.get(value);
		}
		return selectedPointer;
	}
	#removeCacheRecordAboutValue(value){
		var pointer=this.#mapSpecificValueToPointer.get(value);
		this.#mapSpecificValueToPointer.delete(value);
		this.#mapPointerToSpecificValue.delete(pointer);
	}
	/**
	 * Вызывает валидатор указателей, при их большом количестве
	 * Также вызывает увеличитель кол-во байт под указатели
	 */
	#callReferenceCleanerIfManyValues(){
		if(this.#mapPointerToSpecificValue.size>this.#countRecordsForGrowPointerByteSize){
			this.#callPointersValidate();
			this.#selectLevelSizeOfCacheRecordToBuffer();
		}
	}
	/**
	 * Изменить число байт под указатель при большом кол-во данных  
	 * Увеличивает только в возрастание
	 */
	#selectLevelSizeOfCacheRecordToBuffer(){
		if(this.#countBytesForPointerInBufferOfValues==2 && this.#mapPointerToSpecificValue.size>this.#countRecordsForGrowPointerByteSize){
			this.#countBytesForPointerInBufferOfValues=4;
			this.#maxPointerSpecificValue=2**32-1;
			this.#countRecordsForGrowPointerByteSize=getCountRecordsForGrowPointer(this.#countBytesForPointerInBufferOfValues);
		}
		if(this.#countBytesForPointerInBufferOfValues==4 && this.#mapPointerToSpecificValue.size>this.#countRecordsForGrowPointerByteSize){
			this.#countBytesForPointerInBufferOfValues=8;
			this.#maxPointerSpecificValue=Number.MAX_SAFE_INTEGER;
		}
	}
	/**
	 * Удалить все ссылки на данные, на которые ни одна запись не ссылается (вложенные объекты)  
	 * Также создает указатели на значения внутри структур (которые есть в полях хранилища) 
	 */
	#callPointersValidate(){
		var setSpecificValuesThatStorageHas=new Set();
		setSpecificValuesThatStorageHas.add(null);
		//Пройдитесь по специальным полям в хранилище
		for(var value of this.#arrayFuncsForSpecialPropsStorage){
			var toAddValue=value.getValue.call(this);
			if(!setSpecificValuesThatStorageHas.has(toAddValue)) this.#addValuesFromStructureToSetStorageOwnObjects(setSpecificValuesThatStorageHas, toAddValue);
			setSpecificValuesThatStorageHas.add(value.getValue.call(this));
		}
		//Пройдитесь по записям
		var objectForMutatingOnGettingDataFromRecord=new Map();
		for(var indexRecord=0; indexRecord<this.#currentRecords; ++indexRecord){
			/** @type {Map<string, JStypesToDBValue>} */
			var recordObject=this.#mutateMapByRecord(indexRecord, objectForMutatingOnGettingDataFromRecord);
			for(var valueOfRecord of recordObject.values()){
				if(typeof valueOfRecord==="string") setSpecificValuesThatStorageHas.add(valueOfRecord);
				if(typeof valueOfRecord==="object") this.#addValuesFromStructureToSetStorageOwnObjects(setSpecificValuesThatStorageHas, valueOfRecord);
			}
		}
		for(var value of this.#mapSpecificValueToPointer.keys()){
			if(!setSpecificValuesThatStorageHas.has(value)) this.#removeCacheRecordAboutValue(value);
		}
	}
	/** 
	 * Служебная функция для метода на очистку ссылок Хранилища  
	 * Первый аргумент - set со значениями, которые допустимы
	 * @param {Set} setForCollect 
	 * @param {DataStorageStructureValueTypes} structure
	 */
	#addValuesFromStructureToSetStorageOwnObjects(setForCollect, structure){
		if(!setForCollect.has(structure)){
			setForCollect.add(structure);
			switch(getInitialObjectOfStructureForStorage(structure)){
				case(ObjectDynamicStructure):
					for(var key of structure.keys()){
						//Значение по ключу из структуры
						var valueFromValuesStructure=structure.get(key);
						//Если нет такого в кеше, добавьте
						if(!this.#mapSpecificValueToPointer.has(key)) this.#setCacheRecordAboutValue(key);
						setForCollect.add(key);
						//Обработать значение
						switch(typeof valueFromValuesStructure){
							case "string":
								if(!this.#mapSpecificValueToPointer.has(valueFromValuesStructure)) this.#setCacheRecordAboutValue(valueFromValuesStructure);
								setForCollect.add(valueFromValuesStructure);
								break;
							case "object":
								if(!this.#mapSpecificValueToPointer.has(valueFromValuesStructure)) this.#setCacheRecordAboutValue(valueFromValuesStructure);
								this.#addValuesFromStructureToSetStorageOwnObjects(setForCollect, valueFromValuesStructure);
								break;
						}
						this.#selectLevelSizeOfCacheRecordToBuffer();
					}
					break;
				case(ArrayForDataStorage):
					for(var valueFromValuesStructure of structure.values()){
						switch(typeof valueFromValuesStructure){
							case "string":
								if(!this.#mapSpecificValueToPointer.has(valueFromValuesStructure)) this.#setCacheRecordAboutValue(valueFromValuesStructure);
								setForCollect.add(valueFromValuesStructure);
								break;
							case "object":
								if(!this.#mapSpecificValueToPointer.has(valueFromValuesStructure)) this.#setCacheRecordAboutValue(valueFromValuesStructure);
								this.#addValuesFromStructureToSetStorageOwnObjects(setForCollect, valueFromValuesStructure);
								break;
						}
						this.#selectLevelSizeOfCacheRecordToBuffer();
					}
					break;
			}
		}
	}
	/**
	 * @param {number} indexRecord 
	 * @returns {ObjectDBRecord}
	 */
	#createObjectFromRecord(indexRecord){
		var objectRecord={};
		for(var indexField=0; indexField<this.#arrayFields.length; ++indexField){
			var field=this.#arrayFields[indexField];
			objectRecord[field.name]=this.#getValue(indexRecord, field);
		}
		return objectRecord;
	}
	/**
	 * @param {number} indexRecord 
	 * @param {Object} target 
	 * @returns {Object}
	 */
	#mutateObjectByRecord(indexRecord, target){
		for(var indexField=0; indexField<this.#arrayFields.length; ++indexField){
			var field=this.#arrayFields[indexField];
			target[field.name]=this.#getValue(indexRecord, field);
		}
		return target;
	}
	/**
	 * @param {number} indexRecord 
	 * @param {Map} target 
	 * @returns {Map}
	 */
	#mutateMapByRecord(indexRecord, target){
		for(var indexField=0; indexField<this.#arrayFields.length; ++indexField){
			var field=this.#arrayFields[indexField];
			target.set(field.name, this.#getValue(indexRecord, field));
		}
		return target;
	}
	/**
	 * Проверяет число на:
	 * * Число больше или равно 0  
	 * * Число не больше ли чем текущее кол-во записей  
	 * * Числа является целым
	 * 
	 * Возвращает success, при успехе всех проверок
	 * @param {number} indexRecord 
	 * @returns {"success" | string}
	 */
	#checkIndexRecordValidate(indexRecord){
		var result="success";
		if(!isValueIsPositiveInteger(indexRecord)) result=("'indexRecord' parameter must be positive integer");
		else if(indexRecord<0) result="'indexRecord' cant be negative";
		else if(indexRecord>=this.#currentRecords) result=("'indexRecord' cant be more than current records count");
		return result;
	}
	/**
	 * Функция берет два числа и проверяет на:
	 * * Числа являются ли целыми  
	 * * Входят ли они в диапозон (0..currentRecords)  
	 * 
	 * Возвращает success, при успехе всех проверок
	 * @param {number} indexFrom 
	 * @param {number} indexTo 
	 * @returns {"success" | string}
	 */
	#checkIndexFromAndToValidate(indexFrom, indexTo){
		var result="success";
		if((!Number.isInteger(indexFrom)) || (indexFrom<0)) result="'from' parameter must be positive integer";
		else if(indexFrom>this.#currentRecords) result=("'from' cant be more than current records count")
		else if((!Number.isInteger(indexTo)) || (indexTo<0)) result=("'to' parameter must be positive integer");
		else if(indexTo>this.#currentRecords) result=("'to' parameter must be no more than current count records");
		else if(indexFrom>indexTo) result=("'from' parameter cant be more then 'to' parameter");
		return result;
	}
	/**
	 * Проверить строку на: есть ли поле с таким именем
	 * Вернет "success" при успехе, иначе строка с текстом ошибки
	 * @param {string} string 
	 */
	#checkStringIsFieldName(string){
		var result="success";
		if(!isObjectHasSelfProperty(this.#objectFields, string)) result="Storage doesnot have field with name "+string;
		return result;
	}
	/**
	 * Проверить значение на доступность введения его в Хранилище  
	 * В это входит:
	 * * Проверка уникальность значения для поля уникальных значений
	 * * Проверка соответствия типа значения с типом поля
	 * * Проверка диапазонов значения
	 * 
	 * Возвращает 'success', если все хорошо  
	 * Иначе строка с текстом ошибки
	 * @param {number} indexRecord 
	 * @param {DataStorageField} field 
	 * @param {JStypesToDBValue} value
	 * @returns {"success" | string} 
	 */
	#checkValueToPutInFieldWithUnique(indexRecord, field, value){
		var result="success";
		if(field.isFieldUniqueValues){
			var indexRecordWithSameValue=this.#cacheFieldsUniqueValues[field.name].get(value);
			if(indexRecordWithSameValue!=null && (indexRecordWithSameValue!==indexRecord)) result=("Field "+field.name+" unique values already has "+value+" value");
		}
		if(result==="success") result=AllTypesForDataStorageField[field.type].checkValue(field, value, this.#additionalDataForCheckValue);
		return result;
	}
	/**
	 * Проверяет индекс, входит ли он в диапозон (переданное 2 число..переданное 3 число)  
	 * **Не проверяет** переданные аргументы на типы, ожидает int number
	 * @param {number} index 
	 * @param {number} from 
	 * @param {number} to 
	 */
	#isIndexInRange(index, from, to){
		return ((index>=from) && (index<to));
	}
	/**
	 * Принимает значение и возвращает значение с учетом валидирующих правил  
	 * * При numberOutRange = "toRange" значение если вне диапазона, вернет значение в диапазоне 
	 * @param {DataStorageField} field 
	 * @param {JStypesToDBValue} value 
	 */
	#validateValue(field, value){
		var result=value;
		if(AllTypesForDataStorageField[field.type].validateValue){
			result=AllTypesForDataStorageField[field.type].validateValue(field, value, this.#additionalDataForCheckValue);
		}
		return result;
	}
	#isInt32(number){
		var result=true;
		if(!Number.isInteger(number)) result=false;
		else if(Object.is(number, -0)) result=false;
		else if(number>2_147_483_647) result=false;
		else if(number<-2_147_483_648) result=false;
		return result;
	}
	/**
	 * Вернуть кол-во байт для хранения объекта
	*/
	#getByteLengthOfObject(object){
		var length=0;
		if(object!==null){
			if(object instanceof ObjectDynamicStructure){
				for(var key of object.keys()){
					//key
					length+=this.#countBytesForPointerInBufferOfValues;
					//type of value
					length+=1;
					//length value
					var value=object.get(key);
					switch(typeof value){
						case "object":
						case "string":
							length+=this.#countBytesForPointerInBufferOfValues;
							break;
						case "bigint":
							length+=8;
							break;
						case "number":
							if(this.#isInt32(value)){
								length+=4;
							} else length+=8;
							break;
						case "boolean":
							length+=1;
							break;
					}
				}
			} else if(object instanceof ArrayForDataStorage){
				for(var value of object.values()){
					//type of value
					length+=1;
					//length value
					switch(typeof value){
						case "object":
						case "string":
							length+=this.#countBytesForPointerInBufferOfValues;
							break;
						case "bigint":
							length+=8;
							break;
						case "number":
							if(this.#isInt32(value)){
								length+=4;
							} else length+=8;
							break;
						case "boolean":
							length+=1;
							break;
					}
				}
			}
		}
		return length;
	}
	/**
	 * Заменяет данные одного буффера данными второго
	 * @param {ArrayBuffer} targetBuffer 
	 * @param {ArrayBuffer} anotherBuffer 
	 * @param {number} byteLength 
	 * @returns {ArrayBuffer}
	 */
	#replaceDataBufferByBuffer(targetBuffer, anotherBuffer, byteLength){
		var typedArrayOnTargetBuffer=new Uint8Array(targetBuffer);
		var typedArrayOnAnotherBuffer=new Uint8Array(anotherBuffer, 0, byteLength);
		typedArrayOnTargetBuffer.set(typedArrayOnAnotherBuffer);
		return targetBuffer;
	}
	//Дальше идут функции необходимые только создании хранилища
	//Объявляем в классе, чтобы не париться со структурами
	/**
	 * @typedef {Object} oldDataStorageForGetter
	 * @property {ArrayDBFields} [oldArrayFieldsBoolType]
	 * @property {DataView} dataViewOnOldBuffer
	 * @property {number} oldByteSizeOneRecord
	 */
	/**
	 * Получить значение из Хранилища
	 * @param {number} indexRecord 
	 * @param {DataStorageField} oldField 
	 * @param {oldDataStorageForGetter} oldData
	 * @returns {JStypesToDBValue}
	 */
	#getValueFromBuffer(indexRecord, oldField, oldData){
		var dataViewOnOldBuffer=oldData.dataViewOnOldBuffer;
		var oldByteSizeOneRecord=oldData.oldByteSizeOneRecord;
		var offset=oldByteSizeOneRecord*indexRecord+oldField.offset;
		switch(oldField.type){
			case "Dynamic":
				var code=dataViewOnOldBuffer.getUint8(offset);
				switch(getTypeDBFromNumberCode(code)){
					case "Number":
						var value=dataViewOnOldBuffer.getFloat64(offset+1, this.#littleEndian);
						break;
					case "Bool":
						var value=!!dataViewOnOldBuffer.getUint8(offset+1, this.#littleEndian);
						break;
					case "String":
					case "DynamicStructure":
					case "Array":
						var pointer=dataViewOnOldBuffer.getFloat64(offset+1, this.#littleEndian);
						var value=this.#mapPointerToSpecificValue.get(pointer);
						break;
					case "BigInt64":
						var value=dataViewOnOldBuffer.getBigInt64(offset+1, this.#littleEndian);
						break;
					case "BigUint64":
						var value=dataViewOnOldBuffer.getBigUint64(offset+1, this.#littleEndian);
						break;
				}
				break;
			case "String":
			case "DynamicStructure":
				var pointer=dataViewOnOldBuffer.getFloat64(offset, this.#littleEndian);
				var value=this.#mapPointerToSpecificValue.get(pointer);
				break;
			case "Uint8":
				var value=dataViewOnOldBuffer.getUint8(offset);
				break;
			case "Uint16":
				var value=dataViewOnOldBuffer.getUint16(offset, this.#littleEndian);
				break;
			case "Uint32":
				var value=dataViewOnOldBuffer.getUint32(offset, this.#littleEndian);
				break;
			case "Int8":
				var value=dataViewOnOldBuffer.getInt8(offset);
				break;
			case "Int16":
				var value=dataViewOnOldBuffer.getInt16(offset, this.#littleEndian);
				break;
			case "Int32":
				var value=dataViewOnOldBuffer.getInt32(offset, this.#littleEndian);
				break;
			case "Float32":
				var value=dataViewOnOldBuffer.getFloat32(offset, this.#littleEndian);
				break;
			case "Float64":
				var value=dataViewOnOldBuffer.getFloat64(offset, this.#littleEndian);
				break;
			case "BigInt64":
				var value=dataViewOnOldBuffer.getBigInt64(offset, this.#littleEndian);
				break;
			case "BigUint64":
				var value=dataViewOnOldBuffer.getBigUint64(offset, this.#littleEndian);
				break;
			case "Bool":
				if(this.#minimizeBytesToBoolFields===false){
					var value=(!!dataViewOnOldBuffer.getUint8(offset));
				} else {
					var indexBit=oldData.oldArrayFieldsBoolType.indexOf(oldField)%8;
					var value=(!!((dataViewOnOldBuffer.getUint8(offset)>>indexBit)&1));
				}
				break;
			default:
				if(SettingsOfNumericTypesForDataStorageField[oldField.type]){
					var value=SettingsOfNumericTypesForDataStorageField[oldField.type].getter(dataViewOnOldBuffer, offset, this.#littleEndian);
				}
				break;
		}
		return value;
	}
	/**
	 * Возвращает значение указателя из DataView над буффером  
	 * Зависит от числа байт под указатель  
	 * 
	 * Возвращает значение указателя
	 * @param {DataView | InnerExtendedDataView} dataview 
	 * @param {number} countBytes 
	 * @param {number} offset 
	 * @param {{pointer:number}} objectResult 
	 * @returns 
	 */
	#getPointerInBuffer(dataview, countBytes, offset){
		switch(countBytes){
			case 2:
				var pointer=dataview.getUint16(offset, this.#littleEndian);
				break;
			case 4:
				var pointer=dataview.getUint32(offset, this.#littleEndian);
				break;
			case 8:
				var pointer=dataview.getFloat64(offset, this.#littleEndian);
				break;
		}
		return pointer;
	}
	/**
	 * Устанавливает значение-указатель (number) в буффер
	 * @param {DataView | InnerExtendedDataView} dataview 
	 * @param {number} countBytes 
	 * @param {number} offset 
	 * @param {number} pointer
	 * @returns 
	 */
	#setPointerInBuffer(dataview, countBytes, offset, pointer){
		switch(countBytes){
			case 2:
				dataview.setUint16(offset, pointer, this.#littleEndian);
				break;
			case 4:
				dataview.setUint32(offset, pointer, this.#littleEndian);
				break;
			case 8:
				dataview.setFloat64(offset, pointer, this.#littleEndian);
				break;
		}
	}
	/**
	 * Вставляет значение в буффер  
	 * Используется для заполнения буффера данными из структур
	 * 
	 * Возвращает: сколько байт использовано под значение
	 * @param {DataView | InnerExtendedDataView} dataview 
	 * @param {number} startOffset 
	 * @param {JStypesToDBValue} value 
	 */
	#setValueFromStructureToBuffer(dataview, startOffset, value){
		var offset=startOffset;
		var littleEndian=this.#littleEndian;
		switch(typeof value){
			case "boolean":
				//type of value
				var typeTo=getNumberCodeFromTypeDB("Bool");
				dataview.setUint8(offset, typeTo);
				offset+=1;
				//value
				dataview.setUint8(offset, +value);
				offset+=1;
				break;
			case "string":
				//type of value
				var typeTo=getNumberCodeFromTypeDB("String");
				dataview.setUint8(offset, typeTo);
				offset+=1;
				//pointer to string
				this.#setPointerInBuffer(dataview, this.#countBytesForPointerInBufferOfValues, offset, this.#mapSpecificValueToPointer.get(value));
				offset+=this.#countBytesForPointerInBufferOfValues;
				break;
			case "number":
				//type
				if(this.#isInt32(value)){
					var typeTo=getNumberCodeFromTypeDB("Int32");
					dataview.setUint8(offset, typeTo);
					offset+=1;
					dataview.setInt32(offset, value, this.#littleEndian);
					offset+=4;
				} else {
					var typeTo=getNumberCodeFromTypeDB("Number");
					dataview.setUint8(offset, typeTo);
					offset+=1;
					dataview.setFloat64(offset, value, this.#littleEndian);
					offset+=8;
				}
				break;
			case "bigint":
				if(value<0n){
					//type
					var typeTo=getNumberCodeFromTypeDB("BigInt64");
					dataview.setUint8(offset, typeTo);
					offset+=1;
					//data
					dataview.setBigInt64(offset, value, littleEndian);
					offset+=8;
				} else {
					//type
					var typeTo=getNumberCodeFromTypeDB("BigUint64");
					dataview.setUint8(offset, typeTo);
					offset+=1;
					//data
					dataview.setBigUint64(offset, value, littleEndian);
					offset+=8;
				}
				break;
			case "object":
				//type
				var typeTo=getNumberCodeFromStructure(value);//getNumberCodeFromTypeDB("DynamicStructure");
				dataview.setUint8(offset, typeTo);
				offset+=1;
				//data
				this.#setPointerInBuffer(dataview, this.#countBytesForPointerInBufferOfValues, offset, this.#mapSpecificValueToPointer.get(value));
				offset+=this.#countBytesForPointerInBufferOfValues;
				break;
		}
		return offset-startOffset;
	}
	/**
	 * Получить значение из структуры в буффере  
	 * 3-й аргумент - объект куда перенести результаты  
	 * Возвращает объект с fullLength свойством, означающим сколько байт пройдено для получения значения
	 * @param {DataView | InnerExtendedDataView} dataview 
	 * @param {number} startOffset 
	 * @param {{fullLength:number, value:JStypesToDBValue}} objectResult 
	 * @returns 
	 */
	#getValueFromStructureOfBuffer(dataview, startOffset, objectResult={fullLength:0, value:null}){
		//get type value
		objectResult.fullLength=0;
		var codeType=dataview.getUint8(startOffset);
		var typeValue=getTypeDBFromNumberCode(codeType);
		var offsetValue=startOffset+1;
		objectResult.fullLength+=1;
		var littleEndian=this.#littleEndian;
		//get value
		switch(typeValue){
			case "Null":
				var valueToObject=null;
				break;
			case "Int32":
				var valueToObject=dataview.getInt32(offsetValue, littleEndian);
				objectResult.fullLength+=4;
				break;
			case "Number":
				var valueToObject=dataview.getFloat64(offsetValue, littleEndian);
				objectResult.fullLength+=8;
				break;
			case "Bool":
				var valueToObject=!!dataview.getUint8(offsetValue);
				objectResult.fullLength+=1;
				break;
			case "String":
			case "DynamicStructure":
			case "Array":
				var pointerForValueOfKeyInObject=this.#getPointerInBuffer(dataview, this.#countBytesForPointerInBufferOfValues, offsetValue);
				var valueToObject=this.#mapPointerToSpecificValue.get(pointerForValueOfKeyInObject);
				objectResult.fullLength+=this.#countBytesForPointerInBufferOfValues;
				break;
			case "BigInt64":
				var valueToObject=dataview.getBigInt64(offsetValue, littleEndian);
				objectResult.fullLength+=8;
				break;
			case "BigUint64":
				var valueToObject=dataview.getBigUint64(offsetValue, littleEndian);
				objectResult.fullLength+=8;
				break;
		}
		objectResult.value=valueToObject;
		return objectResult;
	}
}
/**
 * Указатель на конкретную запись и конкретное ее поле
 */
class DBCursorToFieldByIndex {
	/** @type {DataStorageFilling} */
	#db=null;
	#indexRecord=0;
	/** @type {DataStorageField} */
	#field=null;
	#getValue=null;
	#setValue=null;
	#checkValue=null;
	#objectSettings=null;
	constructor(db, indexRecord, field, getValue, setValue, checkValue){
		this.#db=db;
		this.#indexRecord=indexRecord;
		this.#field=field;
		this.#getValue=getValue;
		this.#setValue=setValue;
		this.#checkValue=checkValue;
	}
	/** 
	 * Возвращает данные в поле по индексу записи (установленном при создании курсора)
	 * @returns {JStypesToDBValue}
	 */
	get(){
		return this.#getValue.call(this.#db, this.#indexRecord, this.#field);
	}
	/**
	 * Установить данные в Хранилище (проверяет его на валидность)
	 * @param {JStypesToDBValue} value 
	 */
	set(value){
		var checking=this.#checkValue.call(this.#db, this.#indexRecord, this.#field, value);
		if(checking!=="success") throw Error("[DBCursor][set]"+checking);
		this.#setValue.call(this.#db, this.#indexRecord, this.#field, value);
	}
	/**
	 * Возвращает объект настроек курсора  
	 * Объект имеет свойства:
	 * * field - тип string, имя поля, на которое указывает  
	 * * indexRecord - тип number, индекс записи
	 * @returns {{field:string, indexRecord:number}}
	 */
	settings(){
		if(!this.#objectSettings) this.#objectSettings=Object.freeze({field:this.#field.name, indexRecord:this.#indexRecord});
		return this.#objectSettings;
	}
}
class ObjectDynamicStructure {
	/** @type {Map<string, JStypesToDBValue>} */
	#data=new Map();
	/** @type {DataStorageFilling} */
	#belongTo=null;
	/** @type {OperationsForSpecificValuesInStorage} */
	#objectForCacheOperations=null;
	/**
	 * Принимает необязательный объект, создавая записи с ключами и значениями из него
	 * @param {DataStorageFilling} belongTo 
	 * @param {OperationsForSpecificValuesInStorage} objectForCacheOperations 
	 * @param {ObjectDBRecord} [object] 
	 */
	constructor(belongTo, objectForCacheOperations, object){
		if(!belongTo) throw Error("need set belongTo");
		this.#belongTo=belongTo;
		this.#objectForCacheOperations=objectForCacheOperations;
		if(typeof object==="object"){
			//Проверка значений
			var keys=Object.keys(object);
			if(keys.length>maxPropsInObjectDynamicStructure) throw Error(`ObjectDynamicStructure cant have more than ${maxPropsInObjectDynamicStructure} properties`);
			for(var key of keys){
				var checking=checkCanValueBeInObject(this.#belongTo, object[key]);
				if(checking!=="success") throw Error(checking);
			}
			//Установите значения
			for(var key of keys){
				this.set(key, object[key]);
			}
		}
	}
	get belongTo(){
		return this.#belongTo;
	}
	/**
	 * @param {string} key 
	 * @param {JStypesToDBValue} value 
	 */
	set(key, value){
		if(typeof key!=="string") throw Error(`key in ObjectDynamicStructure must be string, getted: ${key} [type: ${typeof key}]`);
		var checking=checkCanValueBeInObject(this.#belongTo, value);
		if(checking!=="success") throw Error(checking);
		if((!this.#data.has(key)) && (this.#data.size>=maxPropsInObjectDynamicStructure)) throw Error(`ObjectDynamicStructure cant have more than ${maxPropsInObjectDynamicStructure} properties`);
		this.#data.set(key, value);
	}
	/**
	 * @param {string} key 
	 * @returns {boolean}
	 */
	has(key){
		if(typeof key!=="string") throw Error("key in ObjectDynamicStructure must be string");
		return this.#data.has(key);
	}
	/** @param {string} key */
	get(key){
		if(typeof key!=="string") throw Error("key in ObjectDynamicStructure must be string");
		return this.#data.get(key);
	}
	/** @param {string} key */
	delete(key){
		return this.#data.delete(key);
	}
	keys(){
		return this.#data.keys();
	}
	values(){
		return this.#data.values();
	}
}
class ArrayForDataStorage {
	/** @type {OperationsForSpecificValuesInStorage} */
	#objectForCacheOperations=null;
	/** @type {JStypesToDBValue[]} */
	#data=[];
	/** @type {DataStorageFilling} */
	#belongTo=null;
	/**
	 * @param {DataStorageFilling} belongTo 
	 * @param {OperationsForSpecificValuesInStorage} objectForCacheOperations 
	 * @param {Array} startValues 
	 */
	constructor(belongTo, objectForCacheOperations, startValues){
		if(!belongTo) throw Error("You need set first arg in object-storage");
		this.#belongTo=belongTo;
		this.#objectForCacheOperations=objectForCacheOperations;
		if(Array.isArray(startValues)){
			if(startValues.length>maxValuesInArrayForDataStorage) throw Error(`Array cant store more than ${maxValuesInArrayForDataStorage}`);
			//Проверьте все значения
			for(var value of startValues){
				var checking=checkCanValueBeInObject(this.#belongTo, value);
				if(checking!=="success") throw Error(checking)
			}
			//Установите значения
			for(var value of startValues){
				this.addElementToEnd(value);
			}
		}
	}
	get length(){
		return this.#data.length;
	}
	get belongTo(){
		return this.#belongTo;
	}
	/** @param {JStypesToDBValue} element */
	addElementToEnd(element){
		var checking=checkCanValueBeInObject(this.#belongTo, element);
		if(checking!=="success") throw Error(checking);
		if(this.#data.length>=maxValuesInArrayForDataStorage) throw Error();
		this.#data.push(element);
	}
	removeElementsFromEnd(count){
		if((this.#data.length-count)>=0) this.#data.length-=count;
		else this.#data.length=0;
	}
	/** @param {number} index */
	getElement(index){
		return this.#data[index];
	}
	/**
	 * @param {number} index  
	 * @param {JStypesToDBValue} element
	 */
	setElement(index, element){
		var checking=checkCanValueBeInObject(this.#belongTo, element);
		if(checking!=="success") throw Error(checking);
		if(index<this.#data.length){
			this.#data[index]=element;
		}
	}
	indexOf(element, startIndex){
		return this.#data.indexOf(element, startIndex);
	}
	/**
	 * @callback callbackOnElementArray
	 * @param {JStypesToDBValue} element
	 * @param {number} index
	 */
	/**
	 * Возвращает копию ArrayForDataStorage
	 * @param {callbackOnElementArray} func 
	 * @returns 
	 */
	map(func){
		var newArray=new Array(this.#data.length);
		for(var i=0, maxI=newArray.length; i<maxI; ++i){
			//Получить значение
			var newValue=func(this.#data[i], i);
			//Проверка значения
			var checking=checkCanValueBeInObject(this.#belongTo, newValue);
			if(checking!=="success") throw Error(checking);
			//Установить значение в новый массив
			newArray[i]=newValue;
		}
		return this.#objectForCacheOperations.createArrayForStorage(newArray);
	}
	filter(func){
		var newArray=this.#data.filter(func);
		return this.#objectForCacheOperations.createArrayForStorage(newArray);
	}
	values(){
		return this.#data.values();
	}
}
function getInitialObjectOfStructureForStorage(structure){
	var result=null;
	if(structure!==null){
		switch(Object.getPrototypeOf(structure)){
			case ObjectDynamicStructure.prototype:
				result=ObjectDynamicStructure;
				break;
			case ArrayForDataStorage.prototype:
				result=ArrayForDataStorage;
				break;
		}
	}
	return result;
}
/**
 * Проверить: можно ли значение сохранить в объект
 * @param {DataStorageFilling} storage 
 * @param {JStypesToDBValue} value 
 * @param {DataStorageStructureValueTypes} [object]
 * @returns 
 */
function checkCanValueBeInObject(storage, value, object){
	var result="success";
	switch(typeof value){
		case "object":
			if(value!==null){
				if(getInitialObjectOfStructureForStorage(value)===null) result=`value ${value} must be valid value`;
				else if(storage!==value.belongTo) result=`value ${value} must be created from same storage`;
			}
			break;
		case "string":
		case "bigint":
		case "number":
		case "boolean":
			break;
		default:
			result=`value ${value} no valid`;
			break;
	}
	return result;
}
/**
 * Вернет int байт по типу  
 * Считайте, что если вернется 0, то это невалидный тип
 * @param {DataStorageAllTypesForField} type
 */
function getByteSizeOfFieldType(type){
	var byteSize=0;
	if(AllTypesForDataStorageField[type]) byteSize=AllTypesForDataStorageField[type].byteSize;
	return byteSize;
}
function isTypeValidForField(type, allowSpecialDataViewTypes){
	var result=true;
	if(SpecialTypesForDataStorageField.includes(type) && (allowSpecialDataViewTypes===false)) result=false;
	if(!TypeDataStorageSavingDataToCode[type]) result=false;
	return result;
}
/**
 * Проверка значения на допустимость вставки его в поле по типу
 * @param {DataStorageField} field
 * @param {JStypesToDBValue} value 
 * @returns {'success' | string}
*/
function checkFieldTypeForValueType(field, value){
	var result="success";
	if(SettingsOfNumericTypesForDataStorageField[field.type]){
		var settingsOfType=SettingsOfNumericTypesForDataStorageField[field.type];
		if(typeof value!==settingsOfType.type) result=`Field ${field.name} needs ${settingsOfType.type} values`;
	} else {
		switch(field.type){
			case "Dynamic":
				switch(typeof value){
					case "string":
					case "number":
					case "boolean":
					case "bigint":
						break;
					case "object":
						if(result==="success" && (value!==null) && (
							!(
								(value instanceof ObjectDynamicStructure) ||
								(value instanceof ArrayForDataStorage)
							)
						)) result="Field "+field.name+" can store ObjectDynamicStructure"
						break;
					default: result="Field "+field.name+" needs string|bool|number|bigint values"
				}
				break;
			case "String":
				if(typeof value!=="string") result="Field "+field.name+" needs string values";
				break;
			case "DynamicStructure":
				if(typeof value!=="object") result="Field "+field.name+" needs object values";
				if(result==="success" && (value!==null) && (
					!(
						(value instanceof ObjectDynamicStructure) ||
						(value instanceof ArrayForDataStorage)
					)
				 )) result="Field "+field.name+" can store only ObjectDynamicStructure"
				break;
			case "Bool":
				if(typeof value!=="boolean") result="Field "+field.name+" needs boolean values";
				break;
		}
	}
	return result;
}
/**
 * Проверить значения на допустимость вставки в поле (не проверяет уникальность значения для полей уникальных значений)  
 * Использовать **только** для проверки типов и диапазонов
 * @param {DataStorageField} field 
 * @param {JStypesToDBValue} value 
 * @param {DataStorageSettingNumberToRange} numberOutRange 
 * @returns {"success" | string}
 */
function checkValueToPutInField(field, value, numberOutRange){
	var result=checkFieldTypeForValueType(field, value);
	if(result==="success"){
		if(SettingsOfNumericTypesForDataStorageField[field.type]){
			var settingsOfType=SettingsOfNumericTypesForDataStorageField[field.type];
			if(settingsOfType.isInteger && (!Number.isInteger(value))) result="Field with type "+field.type+" cant store no int value";
		}
	}
	if(result==="success"){
		if(numberOutRange==="error"){
			if(SettingsOfNumericTypesForDataStorageField[field.type]){
				var settingsOfType=SettingsOfNumericTypesForDataStorageField[field.type];
				if(value<settingsOfType.min) result=`value ${value} less than ${settingsOfType.min} (limit of ${field.type})`;
				else if(value>settingsOfType.max) result=`value ${value} less than ${settingsOfType.max} (limit of ${field.type})`;
			}
		}
	}
	return result;
}
/**
 * @param {DataStorageField[]} arrayFields 
 */
function isFieldsHaveFieldWithSpecificType(arrayFields){
	var result=false;
	for(var i=0; i<arrayFields.length; ++i){
		var field=arrayFields[i];
		switch(field.type){
			case "String":
			case "DynamicStructure":
			case "Dynamic":
				result=true;
				break;
		}
	}
	return result;
}
/**
 * Вернуть значение по умолчанию по типу из Хранилища  
 * Они не будут приведены к строке, это будут обычные JS значения
 * @param {DataStorageAllTypesForField} type 
 * @returns {number | bigint | string | boolean | null}
 */
function getDefaultValueByType(type){
	if(SettingsOfNumericTypesForDataStorageField[type]){
		var settingsOfType=SettingsOfNumericTypesForDataStorageField[type];
		var value=settingsOfType.defaultValue;
	} else {
		switch(type){
			case "String":
				var value="";
				break;
			case "DynamicStructure":
				var value=null;
				break;
			case "Dynamic":
				var value=0;
				break;
			case "Bool":
				var value=false;
				break;
		}
	}
	return value;
}
/**
 * Создать объект ключи которого - имя поля, а значение - объект поля
 * @param {ArrayDBFields} arrayFields 
 */
function createObjectOfFields(arrayFields){
	var obj={};
	for(var i=0, maxI=arrayFields.length; i<maxI; ++i){
		var field=arrayFields[i];
		obj[field.name]=field;
	}
	return obj;
}
/**
 * Проверить значение на является ли оно целочисленным и положительным
 * @param {number} value 
 * @returns {boolean}
 */
function isValueIsPositiveInteger(value){
	return ((Number.isInteger(value)) && (value>=0));
}
/**
 * @param {DataStorageField} field 
 * @returns {JStypesToDBValue}
 */
function getDefaultValueFromFieldDescription(field){
	return getValueFromDescriptionValue(field.defaultValue)
}
/**
 * @typedef {Object} UTF8ValueObjectInformation
 * @property {number} code
 * @property {number} length длина в байтах кода
 */
/**
 * Получить информацию о значении (значение и его длина) закодированном в DataView по UTF-8
 * @param {DataView} dataview 
 * @param {number} offset 
 * @param {UTF8ValueObjectInformation} [objectResult] 
 * @returns {UTF8ValueObjectInformation}
 */
function getUTF8valueInfo(dataview, offset, objectResult={code:NaN, length:0}){
	var byteDesc=dataview.getUint8(offset);
	if((byteDesc>>7)===0){
		objectResult.code=byteDesc;
		objectResult.length=1;
	} else if((byteDesc>>5)===0b110){
		objectResult.code=((byteDesc & 0b00011111) << 6) | (dataview.getUint8(offset+1) & 0b00111111);
		objectResult.length=2;
	} else if((byteDesc>>4)===0b1110){
		objectResult.code=(
			((byteDesc & 0b00001111) << 12) |
			((dataview.getUint8(offset+1) & 0b00111111) << 6) |
			(dataview.getUint8(offset+2) & 0b00111111)
		);
		objectResult.length=3;
	} else if((byteDesc>>3)===0b11110){
		objectResult.code=(
			((byteDesc & 0b00000111) << 18) |
			((dataview.getUint8(offset+1) & 0b00111111) << 12) |
			((dataview.getUint8(offset+2) & 0b00111111) << 6) |
			(dataview.getUint8(offset+3) & 0b00111111)
		);
		objectResult.length=4;
	} else if((byteDesc>>2)===0b111110){
		objectResult.code=(
			((byteDesc & 0b00000011) << 26) |
			((dataview.getUint8(offset+1) & 0b00111111) << 18) |
			((dataview.getUint8(offset+2) & 0b00111111) << 12) |
			((dataview.getUint8(offset+3) & 0b00111111) << 6) |
			(dataview.getUint8(offset+4) & 0b00111111)
		);
		objectResult.length=5;
	}
	return objectResult;
}
/**
 * Получить кол-во байт для значения в кодировке UTF-8
 * @param {number} code 
 * @returns 
 */
function getUTF8valueLength(code){
	var length=0;
	if((code>>7)===0){
		length=1;
	} else if((code>>11)===0){
		length=2;
	} else if((code>>16)===0){
		length=3;
	} else if((code>>21)===0){
		length=4;
	} else if((code>>26)===0){
		length=5;
	}
	return length;
}
/**
 * Вернуть кол-во байт для кодировки строки в UTF-8
 * @param {string} string 
 * @returns 
 */
function getLengthForStringInUTF8(string){
	var length=0;
	for(var codePoint of string) length+=getUTF8valueLength(codePoint.codePointAt(0));
	return length;
}
/**
 * Задать байты в DataView под кодировку значения в UTF-8
 * @param {DataView} dataview 
 * @param {number} offset 
 * @param {number} code 
 * @param {{length:number}} [objectResult]
 */
function setUTF8value(dataview, offset, code, objectResult={length:0}){
	if((code>>7)===0){
		dataview.setUint8(offset, code);
		objectResult.length=1;
	} else if((code>>11)===0){
		dataview.setUint8(offset, 0b11000000 | (code>>6));
		dataview.setUint8(offset+1, 0b10000000 | (code & 0b111111));
		objectResult.length=2;
	} else if((code>>16)===0){
		dataview.setUint8(offset, 0b11100000 | (code>>12));
		dataview.setUint8(offset+1, 0b10000000 | ((code>>6) & 0b111111));
		dataview.setUint8(offset+2, 0b10000000 | (code & 0b111111));
		objectResult.length=3;
	} else if((code>>21)===0){
		dataview.setUint8(offset, 0b11110000 | (code>>18));
		dataview.setUint8(offset+1, 0b10000000 | ((code>>12) & 0b111111));
		dataview.setUint8(offset+2, 0b10000000 | ((code>>6) & 0b111111));
		dataview.setUint8(offset+3, 0b10000000 | (code & 0b111111));
		objectResult.length=4;
	} else if((code>>26)===0){
		dataview.setUint8(offset, 0b11111000 | ((code>>24)));
		dataview.setUint8(offset+1, 0b10000000 | ((code>>18) & 0b111111));
		dataview.setUint8(offset+2, 0b10000000 | ((code>>12) & 0b111111));
		dataview.setUint8(offset+3, 0b10000000 | ((code>>6) & 0b111111));
		dataview.setUint8(offset+4, 0b10000000 | (code & 0b111111));
		objectResult.length=5;
	}
	return objectResult;
}
/**
 * Возвращает число записей после которых следует увеличить число байт под указатели  
 * Выбранная формула расчета: Math.floor(2**(levelSize*8-0.1));
*/
function getCountRecordsForGrowPointer(bytes){
	return Math.floor(2**(bytes*8-0.1));
}
/**
 * Расширенный объект DataView с парой методов для специальных типов
 */
class InnerExtendedDataView extends DataView {
	/**
	 * @param {number} offset 
	 * @param {number} value 
	 * @param {boolean} [littleEndian] 
	 */
	getUint24(offset, littleEndian){
		var result=0;
		if(littleEndian){
			result=this.getUint8(offset)+this.getUint8(offset+1)*256+this.getUint8(offset+2)*65536;
		} else {
			result=this.getUint8(offset+2)+this.getUint8(offset+1)*256+this.getUint8(offset)*65536;
		}
		return result;
	}
	/**
	 * @param {number} offset 
	 * @param {number} value 
	 * @param {boolean} [littleEndian] 
	 */
	setUint24(offset, value, littleEndian){
		if(littleEndian){
			this.setUint8(offset, value&255);
			this.setUint8(offset+1, (value>>>8)&255);
			this.setUint8(offset+2, (value>>>16)&255);
		} else {
			this.setUint8(offset, (value>>>16)&255);
			this.setUint8(offset+1, (value>>>8)&255);
			this.setUint8(offset+2, value&255);
		}
	}
}
/**
 * Получить значение из Описания значения
 * @param {DescriptionValue} descriptionValue
 * @returns {JStypesToDBValue}
 */
function getValueFromDescriptionValue(descriptionValue){
	switch(descriptionValue.type){
		case "string":
			var value=descriptionValue.value;
			break;
		case "number":
			var value=(+descriptionValue.value);
			break;
		case "bigint":
			var value=BigInt(descriptionValue.value);
			break;
		case "boolean":
			var value=(!!descriptionValue.value);
			break;
		case "null":
			var value=null;
			break;
		case "selection":
			var maxWeight=0;
			for(var select of descriptionValue.selection){
				maxWeight+=select.weight;
			}
			var selectedWeight=Math.random()*maxWeight;
			for(var select of descriptionValue.selection){
				if(selectedWeight>select.weight){
					selectedWeight-=select.weight;
				} else {
					var value=getValueFromDescriptionValue(select.value);
					break;
				}
			}
			break;
	}
	return value;
}
/**
 * Создает поле любых значений хранилища
 * @param {string} name 
 * @param {DataStorageAllTypesForField} type 
 * @param {DescriptionValue} [defaultValue] 
 */
function createFieldAnyValues(name, type, defaultValue){
	//Вызываем функцию эту, что проверить: передан валидный тип или нет
	getByteSizeOfFieldType(type, true);
	/** @type {DataStorageField} */
	var objectField={
		name, 
		type, 
		isFieldUniqueValues:false, 
		defaultValue: null
	};
	if(defaultValue===(void 0)){
		//Если неуказано значение
		var val=getDefaultValueByType(type);
	} else var val=defaultValue;
	var insertVal=null;
	switch(typeof val){
		case "string":
			if(typeof val!=="string") throw Error("Value must be string type");
			insertVal=CreatorDescriptionValuesForDataStorage.createString(val);
			break;
		case "number":
			if(typeof val!=="number") throw Error("Value must be number type");
			insertVal=CreatorDescriptionValuesForDataStorage.createNumber(val);
			break;
		case "bigint":
			if(typeof val!=="bigint") throw Error("Value must be bigint type");
			insertVal=CreatorDescriptionValuesForDataStorage.createBigInt(val);
			break;
		case "boolean":
			if(typeof val!=="boolean") throw Error("Value must be boolean type");
			insertVal=CreatorDescriptionValuesForDataStorage.createBoolean(val);
			break;
		case "object":
			if(val===null){
				insertVal=CreatorDescriptionValuesForDataStorage.createNull();
			} else {
				var checking=checkDescriptionValueForGeneratorValue(val);
				if(checking!=="success") throw Error(checking);
				insertVal=val;
			}
			break;
	}
	objectField.defaultValue=insertVal;
	return objectField;
}
/**
 * @typedef {Object} DescriptionValue
 * @property {"boolean" | "string" | "number" | "bigint" | "null" | "selection"} type
 * @property {string} [value]
 * @property { {weight: number, value: DescriptionValue}[] } [selection]
 */
/**
 * @param {DescriptionValue} value 
 * @returns {"success" | string}
 */
function checkDescriptionValueForGeneratorValue(value, innerSet=new Set()){
	var result="success";
	if(typeof value!=="object") result="value must be object type";
	if(!Object.isFrozen(value)) result="value must be read-only";
	check: switch(value.type){
		case "null":
			break;
		case "string":
		case "number":
		case "bigint":
		case "boolean":
			var parsedValue=getValueFromDescriptionValue(value);
			if(typeof parsedValue!==value.type) result=`type ${value.type} no use value ${value.value}`;
			break;
		case "selection":
			if(!Array.isArray(value.selection)) {
				result="Selection must be array";
				break;
			}
			if(value.selection.length<2) {
				result="Selection must have 2 or more elements";
				break;
			}
			if(innerSet.has(value.selection)){
				result="Loop reference";
				break;
			}
			innerSet.add(value.selection);
			for(var select of value.selection){
				if(!isValueIsPositiveInteger(select.weight)){
					result="weight must be positive integer";
					break check;
				}
				if(select.value.type==="selection"){
					var checking=checkDescriptionValueForGeneratorValue(select.value, innerSet);
					if(checking!=="success"){
						result=checking;
						break check;
					}
				}
			}
			break;
		default:
			result=`no valid type ${value.type}`;
			break;
	}
	return result;
}
var CreatorDescriptionValuesForDataStorage={
	get name(){
		return "[CreatorDescriptionValuesForDataStorage] ";
	},
	/**
	 * @param {boolean} value 
	 * @returns {DescriptionValue}
	 */
	createBoolean(value){
		return Object.freeze({type:"boolean", value:value?("true"):("")});
	},
	/**
	 * @param {string} value
	 * @returns {DescriptionValue}
	 */
	createString(value){
		if(typeof value!=="string") throw Error(this.name+"value must be string");
		return Object.freeze({type:"string", value});
	},
	/**
	 * @param {number} value 
	 * @returns {DescriptionValue}
	 */
	createNumber(value){
		if(typeof value!=="number") throw Error(this.name+"value must be number");
		return Object.freeze({type:"number", value:value.toString()});
	},
	/**
	 * @param {bigint} value 
	 * @returns {DescriptionValue}
	 */
	createBigInt(value){
		if(typeof value!=="bigint") throw Error(this.name+"value must be bigint");
		return Object.freeze({type:"bigint", value:value.toString()});
	},
	/**
	 * @returns {DescriptionValue}
	 */
	createNull(){
		return Object.freeze({type:"null"});
	},
	/**
	 * Создать выборку.  
	 * Создается в виде массива из объектов со свойствами weight и value  
	 * weight определяет вероятность выбора
	 * @param {{weight:number,value:DescriptionValue}[]} array 
	 */
	createSelection(array){
		if(!Array.isArray(array)) throw Error(this.name+"value must be array");
		if(array.length<2) throw Error(this.name+"value must have 2 or more elements")
		for(var select of array){
			var checking=checkDescriptionValueForGeneratorValue(select.value);
			if(checking!=="success") throw Error(checking);
		}
		return Object.freeze({type:"selection", selection:array});
	},
	/**
	 * Возвращает значение из описания
	 */
	getValueFromDescriptionValue
}
export {DataStorage, createFieldAnyValues, SymbolUseDefaultValue, CreatorDescriptionValuesForDataStorage}