/**
 * @typedef {"UTF-16"} DBStringEncodingTypes
 * @typedef {"Uint8" | "Uint16" | "Uint32" | "Int8" | "Int16" | "Int32" | "Float32" | "Float64"} DBNumberTypes
 * @typedef {"Uint24"} DBStrangeDataViewTypes
 * @typedef {"BigInt64" | "BigUint64"} DBBigIntTypes
 * @typedef {"Bool"} DBBooleanTypes
 * @typedef {string | number | boolean | bigint} JStypesToDBValue
 * @typedef {'String' | DBNumberTypes | DBBigIntTypes | DBStrangeDataViewTypes | DBBooleanTypes | "Dynamic"} DBValueTypes
 * @typedef {string} DBSpecificValueTypes
 * @typedef {"Number" | "Bool" | "String" | "BigInt64" | "BigUint64"} DBTypesForFieldWithDynamicType
 * @typedef {{
 *   name:string,
 *   type:DBValueTypes,
 *   offset?:number,
 *   isFieldUniqueValues:boolean,
 *   defaultValue?:{
 *     value:string,
 *     to:"number" | "bigint" | "string" | "boolean"
 *   }
 * }} DBField
 * @typedef {Record<string,DBField>} ObjectDBFields
 * @typedef {DBField[]} ArrayDBFields
 * @typedef {Record<string,JStypesToDBValue>} ObjectDBRecord
 * @typedef {Map<string,JStypesToDBValue>} MapObjectDBRecord
 * @typedef {"error" | "toRange"} DBSettingNumberToRange
*/
/**
 * Получить номер по типу данных Хранилища
 * @param {DBTypesForFieldWithDynamicType} type 
 * @returns {number}
 */
function getNumberCodeFromTypeDB(type){
	var code=0;
	switch(type){
		case "Number":
			code=1;
			break;
		case "Bool":
			code=2;
			break;
		case "String": 
			code=3;
			break;
		case "BigInt64":
			code=4;
			break;
		case "BigUint64":
			code=5;
			break;
	}
	return code;
}
/**
 * Получить тип данных Хранилища по номеру
 * @param {number} code
 * @returns {DBTypesForFieldWithDynamicType}
 */
function getTypeDBFromNumberCode(code){
	var type="";
	switch(code){
		case 1:
			type="Number";
			break;
		case 2:
			type="Bool";
			break;
		case 3: 
			type="String";
			break;
		case 4:
			type="BigInt64";
			break;
		case 5:
			type="BigUint64";
			break;
	}
	return type;
}
/**
 * Коллекция Хранилищ и заданных для них callbackAllocation
 * @type {WeakMap<DB_filling, CallbackAllocation>}
 */
var mapStorageToCallbackAllocation=new WeakMap();
/**
 * Данный Symbol используется для modifications addFields в итераторах - верните как значение его в итераторе, чтобы в поле записи было установлено дефолт.значение
 * @type {Symbol}
 */
var SymbolUseDefaultValue=Symbol("defaultValueInIterator");
/**
 * Эта функция будет вызываться когда число записей станет равно числу выделенных записей  
 * Рекомендуется в эту функцию добавить вызов метода на выделение памяти
 * @callback CallbackAllocation
 * @param {number} currentRecords
 * @this {DB_filling}
 */
var DataStorage={
	/**
	 * Создать Хранилище и перейти к настройке полей данных в ней  
	 * 1arg: на сколько записей выделить память сразу  
	 * 2arg: объект с настройками Хранилища  
	 * Свойства для объекта настроек:
	 * * littleEndian: boolean - порядок записи байт
	 * * numberOutRange: string - что делать если number выходит за рамки выбранного типа. При "toRange" - привести к диапазону, при "error" - выброс ошибки
	 * * stringEncoding: string - кодировка строк в Хранилище. Допустимо "UTF-16"
	 * * recordsCountForAdditionInReallocation: number
	 * * minimizeBytesToBoolFields: boolean - минимизировать выделяемую память под поля с Bool типом
	 * 
	 * @param {number} allocatedRecords 
	 * @param {DBCreationObjectSettings} [objectSettings] 
	 * @returns {DB_creating}
	 */
	create(allocatedRecords, objectSettings){
		if(!checkValueIsPositiveInteger(allocatedRecords)) throw Error("[DataStorage][create] arg 'allocatedRecords' must be positive integer");
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
	 *   field:DBField
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
	 * @example
	 * import {DataStorage, createFieldAnyValues} from "DataStorageConstructor.mjs";
	 * var copy=DataStorage.createFrom(JSON.stringify(db.getInfo()), db.getBuffer(), {
	 *   callbackAllocation:function(){},
	 *   modifications:{
	 *     addFields:[
	 *       {
	 *          typeAddValues:"default", //"iterator" но если установите "iterator", нужно будет добавить свойство values с итерируемым объектом
	 *          field:createFieldAnyValues("newdata", "Float64")
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
					if(getByteSizeFieldByType(field.type, object.allowSpecialDataViewTypes)===0) throw Error("[DataStorage][createFrom][modifications][addFields] property of field 'type' no valid");
					if(!field.isFieldUniqueValues){
						if(checkFieldTypeForValueType(field, getDefaultValueFromFieldDescription(field))!=="success") throw Error("[DataStorage][createFrom] defaultValue no compare with type field");
					}
					var checking=checkFieldTypeForValueType(element.field, getDefaultValueFromFieldDescription(element.field));
					if(checking!=="success") throw Error("[DataStorage][createFrom][modifications][addFields] 'defaultValue' no valid for field type");
				}
			}
			if(Object.hasOwn(objectSettings.modifications, "deleteFields")){
				if(!Array.isArray(objectSettings.modifications.deleteFields)) throw Error("[DataStorage][createFrom][modifications] optional property 'deleteFields' must be array of strings");
			}
			if(Object.hasOwn(objectSettings.modifications, "deleteRecords")){
				if(!Array.isArray(objectSettings.modifications.deleteRecords)) throw Error("[DataStorage][createFrom][modifications] optional property 'deleteRecords' must be array of positive integers")
			}
		}
		var indexLastFieldUniqueValues=-1;
		for(var i=0; i<object.fields.length; ++i){
			var field=object.fields[i];
			objectFields[field.name]=field;
			if(field.isFieldUniqueValues){
				indexLastFieldUniqueValues=i;
			}
		}
		return new DB_filling({
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
	 * При неуказанном втором аргументе, хранилище будет создано с callbackAllocation тем же, указанном в копируемом  
	 * Хранилища ничем не будут связаны друг с другом
	 * @param {DB_filling} storageObject 
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
		var buffer=storageObject.getBuffer();
		var indexLastFieldUniqueValues=-1;
		for(var i=0; i<object.fields.length; ++i){
			var field=object.fields[i];
			objectFields[field.name]=field;
			if(field.isFieldUniqueValues){
				indexLastFieldUniqueValues=i;
			}
		}
		return new DB_filling({
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
		for(var char of string){
			view[i]=char.charCodeAt(0);
			i+=1;
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
	/** @type {DBSettingNumberToRange} */
	#numberOutRange="error";
	/** @type {DBStringEncodingTypes} */
	#stringEncoding="UTF-16";
	#minimizeBytesToBoolFields=false;
	#allowSpecialDataViewTypes=false;
	/**
	 * @typedef {{
	 *   littleEndian?:boolean,
	 *   numberOutRange?: DBSettingNumberToRange
	 *   stringEncoding?: DBStringEncodingTypes
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
			if(Object.hasOwn(objectSettings, "numberOutRange")){
				switch(objectSettings.numberOutRange){
					case "error":
					case "toRange":
						this.#numberOutRange=objectSettings.numberOutRange;
						break;
					default: throw Error("param 'numberOutRange' setting can be only strings: 'error' or 'toRange'");
				}
			}
			if(Object.hasOwn(objectSettings, "stringEncoding")){
				switch(objectSettings.stringEncoding){
					//case "UTF-8":
					case "UTF-16":
						this.#stringEncoding=objectSettings.stringEncoding;
						break;
					default: throw Error("param 'stringEncoding' setting can be only strings: 'UTF-16'");
				}
			}
			if(Object.hasOwn(objectSettings, "recordsCountForAdditionInReallocation")){
				if(!checkValueIsPositiveInteger(objectSettings.recordsCountForAdditionInReallocation)) throw Error("param 'recordsCountForAdditionInReallocation' must be positive integer");
				this.#recordsCountForAdditionInReallocation=objectSettings.recordsCountForAdditionInReallocation;
			}
		}
	}
	/**
	 * Добавить поле уникальных значений в Хранилище (значения не могут повторяться)
	 * @param {string} name 
	 * @param {DBValueTypes} type 
	 */
	addFieldUniqueValues(name, type){
		var byteSize=getByteSizeFieldByType(type, this.#allowSpecialDataViewTypes);
		if(Object.hasOwn(this.#objectFields,name)) throw Error(`[addFieldUniqueValues] Field ${name} already has in DB`);
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
	 * @param {DBValueTypes} type 
	 * @param {JStypesToDBValue} [defaultValue]
	 */
	addFieldAnyValues(name, type, defaultValue){
		var byteSize=getByteSizeFieldByType(type, this.#allowSpecialDataViewTypes);
		if(byteSize===0) throw Error("Type no valid");
		if(Object.hasOwn(this.#objectFields,name)) throw Error(`[addFieldAnyValues] Field ${name} already has in DB`);
		/** @type {DBField} */
		var objectField=createFieldAnyValues(name, type, defaultValue);
		if(defaultValue!=undefined){
			var checking=checkValueToPutInField(objectField, defaultValue, this.#numberOutRange);
			if(checking!=="success") throw Error("[addFieldAnyValues] "+checking);
		}
		objectField.offset=this.#offset;
		this.#arrayFields.push(objectField);
		this.#objectFields[name]=objectField;
		this.#offset+=byteSize;
		this.#byteSizeOneRecord+=byteSize;
		return this;
	}
	/**
	 * Устанавливает функцию, которая будет вызываться, когда число записей будет равно числу записей на которые выделена память  
	 * В функции this будет равен объекту Хранилища для работы с данными, для удобства работы
	 * @param {CallbackAllocation} func */
	setCallbackAllocation(func){
		if(typeof func!=="function") throw Error("CallbackAllocation must be function");
		this.#callbackAllocation=func;
		return this;
	}
	/**
	 * Закончить создание Хранилище и перейти к работе с данными  
	 * Обязательно установите callbackAllocation (через метод setCallbackAllocation)
	 */
	endCreation(){
		if(typeof this.#callbackAllocation!=="function") throw Error("[endCreation] CallbackAllocation must be setted");
		return new DB_filling({
			allocatedRecords:this.#allocatedRecords,
			byteSizeOneRecord:this.#offset,
			hasFieldSpecificValues:checkFieldsForHaveThemFieldWithSpecificType(this.#arrayFields),
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
class DB_filling{
	/**
	 * Число записей, которые будут надбавкой для Resizable Buffer
	 * @type {number}
	 */
	#recordsCountForAdditionInReallocation=0;
	#allocatedRecords=0;
	#currentRecords=0;
	#byteSizeOneRecord=0;
	#littleEndian=false;
	/** @type {DBSettingNumberToRange} */
	#numberOutRange="";
	/** @type {DBStringEncodingTypes} */
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
	/** @type {DataView} */
	#dataView=null;
	/** @type {Record<string, JStypesToDBValue>} */
	#objectFieldNameToDefaultValue=null;
	/** @type {Record<string,Map<JStypesToDBValue, Set<number>>>}} */
	#cacheFieldsAnyValues={};
	/** 
	 * Структура вида:  
	 * {
	 *    fieldName: Map( value , indexRecord )
	 * }
	 * @type {Record<string,Map<JStypesToDBValue, number>>} 
	 */
	#cacheFieldsUniqueValues=null;
	/** @type {Map<number, DBSpecificValueTypes>} */
	#mapPointerToNoNumberValue=null;
	/** @type {Map<DBSpecificValueTypes, number>} */
	#mapNoNumberValueToPointer=null;
	/** @type {Map<DBSpecificValueTypes, number>} */
	#mapNoNumberValueToCountUses=null;
	/** @type {2 | 4 | 8} */
	#countBytesForPointerInBufferOfValues=2;
	#pointerSpecificValue=0;
	#maxPointerSpecificValue=2**(8*this.#countBytesForPointerInBufferOfValues)-1;
	/**
	 * @typedef {{
	 *   allocatedRecords:number,
	 *   byteSizeOneRecord:number,
	 *   callbackAllocation:function,
	 *   objectFields:Record<string, DBField>,
	 *   arrayFields:DBField[],
	 *   littleEndian:boolean,
	 *   numberOutRange:DBSettingNumberToRange,
	 *   stringEncoding: DBStringEncodingTypes,
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
		mapStorageToCallbackAllocation.set(this, objectSettings.callbackAllocation);
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
				this.#arrayFields=JSON.parse(JSON.stringify(arrayNewFields));
				this.#objectFields=createObjectOfFields(this.#arrayFields);
			}
			//Задайте отступы для каждого поля в зависимости от длины байт
			var offset=0;
			for(var field of this.#arrayFields){
				field.offset=offset;
				if(this.#minimizeBytesToBoolFields===false){
					//Если не указано минимизировать поля с bool типом
					offset+=getByteSizeFieldByType(field.type, this.#allowSpecialDataViewTypes);
					if(field.isFieldUniqueValues===false){
						if(this.#arrayFieldsAnyValues===null) this.#arrayFieldsAnyValues=[];
						this.#arrayFieldsAnyValues.push(field);
					}
				} else {
					//Если указано минимизировать поля bool
					if(field.type!=="Bool"){
						offset+=getByteSizeFieldByType(field.type, this.#allowSpecialDataViewTypes);
					} else {
						if(this.#arrayFieldsBoolTypes===null) this.#arrayFieldsBoolTypes=[];
						this.#arrayFieldsBoolTypes.push(field);
					}
					if(field.isFieldUniqueValues===false){
						if(this.#arrayFieldsAnyValues===null) this.#arrayFieldsAnyValues=[];
						this.#arrayFieldsAnyValues.push(field)
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
			//Если есть поля особых данных, то сделайте карты для поиска их и счетчик, сколько каждое данное встречается
			if(checkFieldsForHaveThemFieldWithSpecificType(this.#arrayFields)){
				this.#mapPointerToNoNumberValue=new Map();
				this.#mapNoNumberValueToPointer=new Map();
				this.#mapNoNumberValueToCountUses=new Map();
			}
			//Создайте кеш для каждого поля хранилища
			for(var i=0; (i<this.#arrayFields.length); ++i){
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
		if(!objectSettings.arrayBuffer){
			//Если создаем хранилище, а не делаем бекап
			//Установить дефолт.значения
			this.#setDefaultValuesToCache();
		} else {
			//В случае, если это бекап
			//Делаем общие вещи
			this.#currentRecords=objectSettings.currentRecords;
			var dataViewOnAnotherBuffer=this.#allowSpecialDataViewTypes?new InnerExtendedDataView(objectSettings.arrayBuffer):new DataView(objectSettings.arrayBuffer);
			var oldByteSizeOneRecord=objectSettings.byteSizeOneRecord;
			/** @type {oldDataStorageForGetter} */
			var oldData={
				oldByteSizeOneRecord: oldByteSizeOneRecord,
				dataViewOnOldBuffer: dataViewOnAnotherBuffer,
				oldArrayFieldsBoolType:(this.#minimizeBytesToBoolFields?([...objectSettings.arrayFields].filter(elem=>elem.type==="Bool")):null)
			};
			if(this.#mapNoNumberValueToPointer){
				//Если есть кеш особых значений, получите и вставьте кеш из старого буффера
				var oldByteSizeOneRecord=objectSettings.byteSizeOneRecord;
				var littleEndian=this.#littleEndian;
				if((checkFieldsForHaveThemFieldWithSpecificType(this.#arrayFields))){
					for(var i=oldByteSizeOneRecord*this.#allocatedRecords, maxI=dataViewOnAnotherBuffer.byteLength; i<maxI;){
						//Получить значение указателя
						switch(objectSettings.levelSize){
							case 2:
								var pointer=dataViewOnAnotherBuffer.getUint16(i, littleEndian);
								i+=2;
								break;
							case 4:
								var pointer=dataViewOnAnotherBuffer.getUint32(i, littleEndian);
								i+=4;
								break;
							case 8:
								var pointer=dataViewOnAnotherBuffer.getFloat64(i, littleEndian);
								i+=8;
								break;
						}
						//Получить тип значения
						var type=dataViewOnAnotherBuffer.getUint8(i);
						i+=1;
						//Length значения
						var length=dataViewOnAnotherBuffer.getUint32(i, littleEndian);
						i+=4;
						//Получить значение по его типу
						switch(type){
							case getNumberCodeFromTypeDB("String"):
								var value="";
								if(this.#stringEncoding==="UTF-16"){
									if(length===0) value="";
									else {
										var lengthValue=i+length;
										for(i, lengthValue; i<lengthValue; ){
											value+=String.fromCharCode(dataViewOnAnotherBuffer.getUint16(i, littleEndian));
											i+=2;
										}
									}
								}
								break;
						}
						this.#setCacheRecordAboutValue(value, pointer);
					}
				}
			}
			//Установить дефолт.значения
			this.#setDefaultValuesToCache();
			if(!modifications){
				//Если никаких модификаций не было
				this.#replaceDataBufferByBuffer(this.#arrayBuffer, objectSettings.arrayBuffer, this.#currentRecords*this.#byteSizeOneRecord);
			} else {
				//Если были КАКИЕ УГОДНО модификации
				var modificationDeleteRecords=modifications.deleteRecords;
				if(modificationDeleteRecords){
					//Уменьшите кол-во записей на количество валидных индексов
					var decreaseRecordsOn=0;
					for(var index of modificationDeleteRecords){
						if(index<this.#currentRecords) ++decreaseRecordsOn;
					}
					this.#currentRecords-=decreaseRecordsOn;
				}
				if(!arrayNewFields){
					//Если поля остались без изменений
					//Но учитываем то, что записи могли удалить в модификациях
					for(var field of this.#arrayFields){
						var indexCursorInNewBuffer=0;
						for(var indexRecord=0, maxIndexRecord=this.#currentRecords; indexRecord<maxIndexRecord; ++indexRecord){
							if(!modifications.deleteRecords?.includes(indexRecord)){
								var value=this.#getValueFromBuffer(indexRecord, field, oldData);
								this.#setValue(indexCursorInNewBuffer, field, value);
								indexCursorInNewBuffer+=1;
							}
						}
					}
				} else {
					//Если изменили поля
					for(var field of this.#arrayFields){
						var indexCursorInNewBuffer=0;
						var newFieldSettings=modifications.addFields?.find(elem=>elem.field.name===field.name);
						if(!newFieldSettings){
							//Если поле старое (НЕ новое)
							var indexCursorInNewBuffer=0;
							var oldField=objectSettings.objectFields[field.name];
							if(modificationDeleteRecords){
								//Если есть массив удаляемых записей
								for(var indexRecord=0; indexRecord<this.#currentRecords; ++indexRecord){
									if(!modificationDeleteRecords.includes(indexRecord)){
										var value=this.#getValueFromBuffer(indexRecord, oldField, oldData);
										this.#setValue(indexCursorInNewBuffer, field, value);
										indexCursorInNewBuffer+=1;
									}
								}
							} else {
								//Если нет массива удаляемых записей
								for(var indexRecord=0; indexRecord<this.#currentRecords; ++indexRecord){
									var value=this.#getValueFromBuffer(indexRecord, oldField, oldData);
									this.#setValue(indexCursorInNewBuffer, field, value);
									indexCursorInNewBuffer+=1;
								}
								//Циклы одинаковые, просто из этого удаляем проверку
								//Разделили в целях экономии
							}
						} else {
							//Если поле новое
							var indexCursorInNewBuffer=0;
							var newField=this.#objectFields[field.name];
							if(!Object.hasOwn(newFieldSettings, "typeAddValues") || (newFieldSettings.typeAddValues==="default")){
								//Если новое поле просто указано заполнить дефолт-значениями (по умолчанию мы все равно заполняем его дефолтами)
								var value=getDefaultValueFromFieldDescription(newField);
								for(var indexRecord=0, maxIndexRecord=this.#currentRecords; indexRecord<maxIndexRecord; ++indexRecord){
									if(!modifications.deleteRecords?.includes(indexRecord)){
										this.#setValue(indexCursorInNewBuffer, newField, value);
										indexCursorInNewBuffer+=1;
									}
								}
							} else if(newFieldSettings.typeAddValues==="iterator") {
								//Если новое поле указано заполнить итератором
								var indexRecord=0;
								var maxIndexRecord=this.#currentRecords;
								var defaultValue=getDefaultValueFromFieldDescription(newField);
								if(modificationDeleteRecords){
									//Если есть массив удаляемых записей
									for(var value of newFieldSettings.values){
										while(modificationDeleteRecords.includes(indexRecord)) {
											++indexRecord;
										}
										if(indexCursorInNewBuffer>=maxIndexRecord) break;
										if(value===SymbolUseDefaultValue) {
											if(newField.isFieldUniqueValues) throw Error("Fields unique values cant have default values")
											value=defaultValue;
										}
										var checking=this.#checkValueToPutInFieldWithUnique(indexCursorInNewBuffer, newField, value);
										if(checking!=="success") throw Error("[DataStorage]"+checking);
										this.#setValue(indexCursorInNewBuffer, newField, value);
										indexCursorInNewBuffer+=1;
										++indexRecord;
									}
								} else {
									//Если нет массива удаляемых записей
									for(var value of newFieldSettings.values){
										if(indexCursorInNewBuffer>=maxIndexRecord) break;
										if(value===SymbolUseDefaultValue) {
											if(newField.isFieldUniqueValues) throw Error("Fields unique values cant have default values")
											value=defaultValue;
										}
										var checking=this.#checkValueToPutInFieldWithUnique(indexCursorInNewBuffer, newField, value);
										if(checking!=="success") throw Error("[DataStorage]"+checking);
										this.#setValue(indexCursorInNewBuffer, newField, value);
										indexCursorInNewBuffer+=1;
									}
									//Циклы одинаковые, просто из этого удаляем проверку
									//Разделили в целях экономии
								}
								if(indexCursorInNewBuffer<maxIndexRecord){
									//Если итератор не полностью заполнил хранилище
									//Если это было поле уникальных значений, то выбросьте ошибку
									if(field.isFieldUniqueValues) throw Error("Field Unique Values must have all values");
									//Остатки заполните дефол.значением
									var value=getDefaultValueFromFieldDescription(newField);
									for(indexCursorInNewBuffer; indexCursorInNewBuffer<maxIndexRecord; ++indexCursorInNewBuffer){
										this.#setValue(indexCursorInNewBuffer, newField, value)
									}
								}
							}
						}
					}
				}
				//Очистить в кеше значения, которые не встречаются
				for(var value of this.#mapNoNumberValueToPointer){
					var uses=this.#mapNoNumberValueToCountUses.get(value);
					if(uses!==Infinity && (uses!==0)){
						var pointer=this.#mapNoNumberValueToPointer.get(value);
						this.#mapNoNumberValueToPointer.delete(value);
						this.#mapPointerToNoNumberValue.delete(pointer);
						this.#mapNoNumberValueToCountUses.delete(value);
					}
				}
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
		if(!checkValueIsPositiveInteger(countRecords)) throw Error("[allocateMemoryForRecords] 1arg is 'countRecords' must be positive integer");
		if(this.#arrayBuffer.resizable && (this.#arrayBuffer.byteLength+countRecords*this.#byteSizeOneRecord<this.#arrayBuffer.maxByteLength)){
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
	 * Добавить запись, данные будут заполняться по схеме: индекс аргумента - индекс поля
	 * @param  {...JStypesToDBValue} values 
	 */
	addRecordByArgs(...values){
		if(this.#currentRecords===this.#allocatedRecords) throw Error("[addRecordByArgs] Do allocate memory for new records");
		if(this.#indexLastFieldUniqueValues>(-1) && (values.length<=this.#indexLastFieldUniqueValues)) throw Error("[addRecordByArgs] Fields Unique Values must has value");
		//checking values type before adding them
		for(var i=0, max=Math.min(this.#arrayFields.length, values.length); i<max; ++i){
			var value=values[i];
			var field=this.#arrayFields[i];
			var checking=this.#checkValueToPutInFieldWithUnique(this.#currentRecords, field, this.#validateValue(field, value));
			if(checking!=="success") throw Error("[addRecordByArgs] "+checking);
		}
		//adding values
		this.#addRecordByArgs(...values);
		return this;
	}
	/**
	 * Добавить запись, задать ее данные по данным из объекта, где ключ - имя поля, значение - данные
	 * @param  {Record<string, JStypesToDBValue>} objectData
	 */
	addRecordByObject(objectData){
		if(this.#currentRecords===this.#allocatedRecords) throw Error("[addRecordByObject] Do allocate memory for new records");
		var keys=Object.keys(objectData);
		if(this.#arrayFieldsUniqueValues.length){
			var i=0; 
			for(var stringPropName of keys){
				var field=this.#objectFields[stringPropName];
				if(field?.isFieldUniqueValues) ++i;
			}
			if(i!==this.#arrayFieldsUniqueValues.length) throw Error("[addRecordByObject] All fields unique values must have values");
		}
		//checking values type before adding them
		for(var stringPropName of keys){
			var value=objectData[stringPropName];
			var field=this.#objectFields[stringPropName];
			if(field){
				var checking=this.#checkValueToPutInFieldWithUnique(this.#currentRecords, field, this.#validateValue(field, value));
				if(checking!=="success") throw Error("[addRecordByObject] "+checking);
			}
		}
		//adding values
		this.#addRecordByObject(objectData);
		return this;
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
	 * @returns {ObjectDBRecord}
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
	/**
	 * @typedef {{
	 *   currentRecords:number,
	 *   allocatedRecords:number,
	 *   byteSizeOneRecord:number,
	 *   usedMemoryForBaseBuffer:number,
	 *   fields:ArrayDBFields,
	 *   stringEncoding:DBStringEncodingTypes,
	 *   numberOutRange:DBSettingNumberToRange
	 *   littleEndian:boolean,
	 *   minimizeBytesToBoolFields:boolean
	 *   allowSpecialDataViewTypes:boolean
	 *   levelSize:number
	 * }} ObjectDBInfo
	 */
	/**
	 * Получить объект с некоторыми данными Хранилища по типу: максимум записей, на сколько записей выделена память и тд  
	 * Метод необходим при сохранении данных Хранилища в файлы, так как через данные из этого метода буффер можно восстановить
	 * @returns {ObjectDBInfo}
	 */
	getInfo(){
		return {
			currentRecords:this.#currentRecords,
			allocatedRecords:this.#allocatedRecords,
			byteSizeOneRecord:this.#byteSizeOneRecord,
			usedMemoryForBaseBuffer:this.getByteLength("basebuffer"),
			usedMemoryForAllData:this.getByteLength("alldata"),
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
	 * * "alldata" - буффер + длина всех кешируемых данных  
	 * * "basebuffer" - длину основного буфера (не идет подсчет длины кешированных данных)  
	 * * "record" - кол-во байт на запись  
	 * По умолчанию - basebuffer
	 * @param {"alldata" | "basebuffer" | "record"} [typeCalculation]
	 */
	getByteLength(typeCalculation){
		var result=0;
		if(!typeCalculation || typeCalculation==="basebuffer"){
			result=this.#arrayBuffer.byteLength;
		} else if(typeCalculation==="alldata"){
			/*
				Пожалуйста помни схему:
				[pointer: 2 | 4 | 8 байт][type of value: 1 байт][length of value: 4 байта][? content: number байт]
			*/
			result=this.#arrayBuffer.byteLength;
			if(this.#mapPointerToNoNumberValue){
				var byteLengthPointers=this.#mapPointerToNoNumberValue.size*this.#countBytesForPointerInBufferOfValues;
				var byteLengthLengthValue=this.#mapPointerToNoNumberValue.size*4;
				var byteLengthTypeValue=this.#mapPointerToNoNumberValue.size*1;
				var byteLengthValueData=0;
				for(var value of this.#mapPointerToNoNumberValue.values()){
					if(typeof value==="string") byteLengthValueData+=value.length*2;
				}
				var addBytes=(byteLengthPointers+byteLengthTypeValue+byteLengthLengthValue+byteLengthValueData);
				result+=addBytes;
			}
		} else if(typeCalculation==="record") result=this.#byteSizeOneRecord;
		return result;
	}
	/**
	 * Возвращает копию буффера со всеми данными  
	 * Используйте для сохранения данных в файлы
	 * @returns {ArrayBuffer}
	 */
	getBuffer(){
		if(this.#mapPointerToNoNumberValue){
			var result=new ArrayBuffer(this.getByteLength("alldata"));
			var dataview=new DataView(result);
			this.#replaceDataBufferByBuffer(result, this.#arrayBuffer);
			var offset=this.#arrayBuffer.byteLength;
			var littleEndian=this.#littleEndian;
			for(var pointer of this.#mapPointerToNoNumberValue.keys()){
				var value=this.#mapPointerToNoNumberValue.get(pointer);
				switch(this.#countBytesForPointerInBufferOfValues){
					case 2:
						dataview.setUint16(offset, pointer , littleEndian);
						offset+=2;
						break;
					case 4:
						dataview.setUint32(offset, pointer , littleEndian);
						offset+=4;
						break;
					case 8:
						dataview.setFloat64(offset, pointer , littleEndian);
						offset+=8;
						break;
				}
				if(typeof value==="string"){
					dataview.setUint8(offset, getNumberCodeFromTypeDB("String"), littleEndian);
					offset+=1;
					dataview.setUint32(offset, value.length*2, littleEndian);
					offset+=4;
					var localoffset=0;
					if(this.#stringEncoding==="UTF-16"){
						for(var i=0; i<value.length; ++i){
							dataview.setUint16(offset+localoffset, value.charCodeAt(i), littleEndian)
							localoffset+=2;
						}
					}
					offset+=localoffset;
				}
			}
		} else {
			var result=this.#arrayBuffer.slice();
		}
		return result;
	}
	/**
	 * Возвращает строку из символов, каждый из которых будет байтом буффера
	 * @returns {string}
	 */
	getStringFromBuffer(){
		var result="";
		for(var byte of new Uint8Array(this.getBuffer())) result+=String.fromCharCode(byte);
		return result;
	}
	/**
	 * Задать данные поля записи по индексу
	 * @param {number} indexRecord 
	 * @param {string} fieldName 
	 * @param {JStypesToDBValue} value 
	 */
	setRecordDataOfField(indexRecord, fieldName, value){
		var checking=this.#checkIndexRecordValidate(indexRecord);
		if(checking!=="success") throw Error("[setDataOfRecordInField] "+checking);
		checking=this.#checkStringIsFieldName(fieldName);
		if(checking!=="success") throw Error("[setDataOfRecordInField] "+checking);
		var field=this.#objectFields[fieldName];
		value=this.#validateValue(field, value);
		checking=this.#checkValueToPutInFieldWithUnique(indexRecord, field, value);
		if(checking!=="success") throw Error("[setDataOfRecordInField] "+checking);
		this.#setValue(indexRecord, field, value);
	}
	/**
	 * Задать данные в записи по ее индексу  
	 * Передайте в аргумент объект, в котором ключ - имя поля, значение - данные
	 * @param {number} indexRecord 
	 * @param {ObjectDBRecord} objectData 
	 */
	setRecordDataByObject(indexRecord, objectData){
		var checking=this.#checkIndexRecordValidate(indexRecord);
		if(checking!=="success") throw Error('[setDataOfRecordByObject]'+checking);
		var keys=Object.keys(objectData);
		for(var stringPropName of keys){
			//Проверяем все поля указанные в объекте на валидность
			var field=this.#objectFields[stringPropName];
			if(field){
				var checking=this.#checkValueToPutInFieldWithUnique(indexRecord, field, this.#validateValue(field, objectData[stringPropName]));
				if(checking!=="success") throw Error("[setDataOfRecordByObject] "+checking);
			}
		}
		for(var stringPropName of keys){
			var field=this.#objectFields[stringPropName];
			if(field) this.#setValue(indexRecord, field, this.#validateValue(field, objectData[stringPropName]));
		}
	}
	/**
	 * 
	 * @param {number} count 
	 */
	setRecordsCountForAdditionInReallocation(count){
		if(!Number.isInteger(count) || (count<0)) throw Error("[setRecordsCountForAdditionInReallocation] arg 'count' must be positive integer");
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
					var equalWith=this.#getValue(result, field);
					if(value!==equalWith) return -1;
				}
			}
			return this.#checkIndexInRange(result, indexFrom, indexTo)?result:-1;
		} else {
			//В случае, если не найдено полей уникальных значений
			/** @type {Set<number>} */
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
				if(this.#checkIndexInRange(index, indexFrom, indexTo)) return index;
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
			if(this.#checkIndexInRange(indexRecordValid, indexFrom, indexTo)) return [indexRecordValid];
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
				if(!this.#checkIndexInRange(index, indexFrom, indexTo)) set.delete(index);
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
	 * Возвращает объект-указатель, методы которого обращены к конкретному полю конкретной записи  
	 * Выгоден при частых обращениях к одним и тем же данным в поле конкретной записи
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
	 * Добавляет запись и данные, использует default значения
	 * @param  {...JStypesToDBValue} values 
	 */
	#addRecordByArgs(...values){
		for(var i=0, max=Math.min(values.length, this.#arrayFields.length); i<max; ++i){
			var value=values[i];
			var field=this.#arrayFields[i];
			this.#setValue(this.#currentRecords, field, this.#validateValue(field, value));
		}
		for(i; i<this.#arrayFields.length; ++i){
			var field=this.#arrayFields[i];
			this.#setValue(this.#currentRecords, field, this.#objectFieldNameToDefaultValue[field.name]);
		}
		this.#currentRecords+=1;
		if(this.#currentRecords===this.#allocatedRecords) this.#callbackAllocation.call(this, this.#currentRecords);
	}
	/**
	 * Добавляет запись и данные, использует default значения  
	 * Не требует Object.keys
	 * @param {ObjectDBRecord} objectData
	 */
	#addRecordByObject(objectData){
		for(var i=0, max=this.#arrayFields.length; i<max; ++i){
			var field=this.#arrayFields[i];
			var fieldName=this.#arrayFields[i].name;
			var value=Object.hasOwn(objectData, fieldName)? this.#validateValue(field, objectData[fieldName]): this.#objectFieldNameToDefaultValue[field.name];
			this.#setValue(this.#currentRecords, field, value)
		}
		this.#currentRecords+=1;
		if(this.#currentRecords===this.#allocatedRecords) this.#callbackAllocation.call(this, this.#currentRecords);
	}
	/**
	 * Получить значение из Хранилища
	 * @param {number} indexRecord 
	 * @param {DBField} field 
	 * @returns {JStypesToDBValue}
	 */
	#getValue(indexRecord, field){
		var offset=this.#byteSizeOneRecord*indexRecord+field.offset;
		switch(field.type){
			case "Dynamic":
				var code=this.#dataView.getUint8(offset);
				switch(getTypeDBFromNumberCode(code)){
					case "Number":
						var value=this.#dataView.getFloat64(offset+1, this.#littleEndian);
						break;
					case "Bool":
						var value=!!this.#dataView.getUint8(offset+1, this.#littleEndian);
						break;
					case "String":
						var pointer=this.#dataView.getFloat64(offset+1, this.#littleEndian);
						var value=this.#mapPointerToNoNumberValue.get(pointer);
						break;
					case "BigInt64":
						var value=this.#dataView.getBigInt64(offset+1, this.#littleEndian);
						break;
					case "BigUint64":
						var value=this.#dataView.getBigUint64(offset+1, this.#littleEndian);
						break;
				}
				break;
			case "String":
				var pointer=this.#dataView.getFloat64(offset, this.#littleEndian);
				var value=this.#mapPointerToNoNumberValue.get(pointer);
				break;
			case "Uint8":
				var value=this.#dataView.getUint8(offset);
				break;
			case "Uint16":
				var value=this.#dataView.getUint16(offset, this.#littleEndian);
				break;
			case "Uint24":
				var value=this.#dataView.getUint24(offset, this.#littleEndian);
				break;
			case "Uint32":
				var value=this.#dataView.getUint32(offset, this.#littleEndian);
				break;
			case "Int8":
				var value=this.#dataView.getInt8(offset);
				break;
			case "Int16":
				var value=this.#dataView.getInt16(offset, this.#littleEndian);
				break;
			case "Int32":
				var value=this.#dataView.getInt32(offset, this.#littleEndian);
				break;
			case "Float32":
				var value=this.#dataView.getFloat32(offset, this.#littleEndian);
				break;
			case "Float64":
				var value=this.#dataView.getFloat64(offset, this.#littleEndian);
				break;
			case "BigInt64":
				var value=this.#dataView.getBigInt64(offset, this.#littleEndian);
				break;
			case "BigUint64":
				var value=this.#dataView.getBigUint64(offset, this.#littleEndian);
				break;
			case "Bool":
				if(this.#minimizeBytesToBoolFields===false){
					var value=(!!this.#dataView.getUint8(offset));
				} else {
					var indexBit=this.#arrayFieldsBoolTypes.indexOf(field)%8;
					var value=(!!((this.#dataView.getUint8(offset)>>indexBit)&1));
				}
				break;
		}
		return value;
	}
	/**
	 * Устанавливает значения в Хранилище, не делая никаких проверок
	 * @param {number} indexRecord 
	 * @param {DBField} field 
	 * @param {JStypesToDBValue} value 
	 */
	#setValue(indexRecord, field, value){
		var offset=this.#byteSizeOneRecord*indexRecord+field.offset;
		var littleEndian=this.#littleEndian;
		//установить в кеш
		if(field.isFieldUniqueValues){
			if((indexRecord<this.#currentRecords)){
				var oldValue=this.#getValue(indexRecord, field);
				this.#cacheFieldsUniqueValues[field.name].delete(oldValue);
			}
			this.#cacheFieldsUniqueValues[field.name].set(value, indexRecord);
		} else {
			var oldValue=this.#getValue(indexRecord, field);
			var cacheOldValue=this.#cacheFieldsAnyValues[field.name].get(oldValue);
			if(cacheOldValue){
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
		switch(field.type){
			case "Dynamic":
				switch(typeof value){
					case "number":
						this.#dataView.setUint8(offset, getNumberCodeFromTypeDB("Number"));
						this.#dataView.setFloat64(offset+1, value, littleEndian);
						break;
					case "bigint":
						/** @type {DBBigIntTypes} */
						var typeOfBigInt="BigInt64";
						if(value>9_223_372_036_854_775_807n) typeOfBigInt="BigUint64";
						this.#dataView.setUint8(offset, getNumberCodeFromTypeDB(typeOfBigInt));
						if(typeOfBigInt==="BigInt64") this.#dataView.setBigInt64(offset+1, value, littleEndian);
						if(typeOfBigInt==="BigUint64") this.#dataView.setBigUint64(offset+1, value, littleEndian);
						break;
					case "boolean":
						this.#dataView.setUint8(offset, getNumberCodeFromTypeDB("Bool"));
						this.#dataView.setUint8(offset+1, (+value), littleEndian);
						break;
					case "string":
						this.#dataView.setUint8(offset, getNumberCodeFromTypeDB("String"));
						var checking=this.#mapNoNumberValueToPointer.has(value);
						if(checking){
							var pointer=this.#mapNoNumberValueToPointer.get(value);
						} else {
							var pointer=this.#setCacheRecordAboutValue(value);
						}
						this.#dataView.setFloat64(offset+1, pointer, littleEndian);
						break;
				}
				break;
			case "String":
				var checking=this.#mapNoNumberValueToPointer.has(value);
				if(checking){
					var pointer=this.#mapNoNumberValueToPointer.get(value);
				} else {
					var pointer=this.#setCacheRecordAboutValue(value);
				}
				this.#dataView.setFloat64(offset, pointer, littleEndian);
				break;
			case "Uint8":
				this.#dataView.setUint8(offset, value);
				break;
			case "Uint16":
				this.#dataView.setUint16(offset, value, littleEndian);
				break;
			case "Uint24":
				this.#dataView.setUint24(offset, value, littleEndian);
				break;
			case "Uint32":
				this.#dataView.setUint32(offset, value, littleEndian);
				break;
			case "Int8":
				this.#dataView.setInt8(offset, value);
				break;
			case "Int16":
				this.#dataView.setInt16(offset, value, littleEndian);
				break;
			case "Int32":
				this.#dataView.setInt32(offset, value, littleEndian);
				break;
			case "Float32":
				this.#dataView.setFloat32(offset, value, littleEndian);
				break;
			case "Float64":
				this.#dataView.setFloat64(offset, value, littleEndian);
				break;
			case "BigInt64":
				this.#dataView.setBigInt64(offset, value, littleEndian);
				break;
			case "BigUint64":
				this.#dataView.setBigUint64(offset, value, littleEndian);
				break;
			case "Bool":
				if(this.#minimizeBytesToBoolFields===false){
					this.#dataView.setUint8(offset, (+value));
				} else {
					var valueInField=this.#dataView.getUint8(offset);
					var indexBit=this.#arrayFieldsBoolTypes.indexOf(field)%8;
					if(value){
						var valueToPut=(valueInField|(1<<indexBit));
					} else {
						var valueToPut=(~(~valueInField|(1<<indexBit)));
					}
					this.#dataView.setUint8(offset, valueToPut);
				}
				break;
		}
		switch(typeof value){
			case "string":
				this.#addCacheCountsToValueSpecificType(value);
				break;
		}
		switch(typeof oldValue){
			case "string":
				this.#decreaseCacheCountsToValueSpecificType(oldValue);
				break;
		}
	}
	/**
	 * Создает запись в кеше (указатель -> значение И значение -> указатель)  
	 * Берет указатель из второго аргумента, иначе генерирует его  
	 * Возвращает указатель на данные переданные 
	 * @param {string} value 
	 * @param {number} [pointer] 
	 * @returns {number}
	 */
	#setCacheRecordAboutValue(value, pointer){
		if(!this.#mapNoNumberValueToPointer.has(value)){
			if(typeof pointer!=="number"){
				while(true){
					if(this.#mapPointerToNoNumberValue.has(this.#pointerSpecificValue)){
						if(this.#pointerSpecificValue>=this.#maxPointerSpecificValue) this.#pointerSpecificValue=0;
						else ++this.#pointerSpecificValue;
					} else break;
				}
				this.#mapNoNumberValueToPointer.set(value, this.#pointerSpecificValue);
				this.#mapPointerToNoNumberValue.set(this.#pointerSpecificValue, value);
				var selectedPointer=this.#pointerSpecificValue;
			} else {
				this.#mapPointerToNoNumberValue.set(pointer, value);
				this.#mapNoNumberValueToPointer.set(value, pointer);
				var selectedPointer=pointer;
			}
			this.#selectLevelSizeOfCacheRecordToBuffer();
		} else {
			var selectedPointer=this.#mapNoNumberValueToPointer.get(value)
		}
		return selectedPointer;
	}
	#addCacheCountsToValueSpecificType(newValue){
		if(this.#mapNoNumberValueToCountUses.has(newValue)) var uses=this.#mapNoNumberValueToCountUses.get(newValue);
		else var uses=0;
		this.#mapNoNumberValueToCountUses.set(newValue, uses+1);
	}
	#decreaseCacheCountsToValueSpecificType(oldValue){
		if(this.#mapNoNumberValueToCountUses.has(oldValue)){
			var uses=this.#mapNoNumberValueToCountUses.get(oldValue)
			uses-=1;
			if(uses===0){
				var pointer=this.#mapNoNumberValueToPointer.get(oldValue);
				this.#mapNoNumberValueToPointer.delete(oldValue);
				this.#mapPointerToNoNumberValue.delete(pointer);
				this.#mapNoNumberValueToCountUses.delete(oldValue);
			} else {
				this.#mapNoNumberValueToCountUses.set(oldValue, uses)
			}
		}
	}
	#selectLevelSizeOfCacheRecordToBuffer(){
		//selected formula: Math.floor(2**(levelSize*8-0.1));
		if(this.#countBytesForPointerInBufferOfValues==2 && this.#mapPointerToNoNumberValue.size>61147){
			this.#countBytesForPointerInBufferOfValues=4;
			this.#maxPointerSpecificValue=2**32-1;
		}
		if(this.#countBytesForPointerInBufferOfValues==4 && this.#mapPointerToNoNumberValue.size>4007346184){
			this.#countBytesForPointerInBufferOfValues=8;
			this.#maxPointerSpecificValue=Number.MAX_SAFE_INTEGER;
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
	 * Проверяет индекс: он не меньше ли 0 и не больше ли чем текущее кол-во записей
	 * @param {number} indexRecord 
	 * @returns {"success" | string}
	 */
	#checkIndexRecordValidate(indexRecord){
		var result="success";
		if(!checkValueIsPositiveInteger(indexRecord)) result=("'indexRecord' parameter must be positive integer");
		if(indexRecord>=this.#currentRecords) result=("'indexRecord' cant be more than current records count");
		return result;
	}
	/**
	 * Функция берет два числа и проверяет входят ли они в диапозон (0..currentRecords)
	 * @param {number} indexFrom 
	 * @param {number} indexTo 
	 * @returns {"success" | string}
	 */
	#checkIndexFromAndToValidate(indexFrom, indexTo){
		var result="success";
		if((!Number.isInteger(indexFrom)) || (indexFrom<0)) result="'from' parameter must be positive integer";
		if(indexFrom>this.#currentRecords) result=("'from' cant be more than current records count")
		if((!Number.isInteger(indexTo)) || (indexTo<0)) result=("'to' parameter must be positive integer");
		if(indexTo>this.#currentRecords) result=("'to' parameter must be no more than current count records");
		if(indexFrom>indexTo) result=("'from' parameter cant be more then 'to' parameter");
		return result;
	}
	/**
	 * Проверить строку на: есть ли поле с таким именем
	 * Вернет "success" при успехе, иначе строка с текстом ошибки
	 * @param {string} string 
	 */
	#checkStringIsFieldName(string){
		var result="success";
		if(!Object.hasOwn(this.#objectFields, string)) result="Database doesnot have field with name "+string;
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
	 * @param {DBField} field 
	 * @param {JStypesToDBValue} value
	 * @returns {"success" | string} 
	 */
	#checkValueToPutInFieldWithUnique(indexRecord, field, value){
		var result="success";
		if(field.isFieldUniqueValues){
			var indexRecordWithSameValue=this.#cacheFieldsUniqueValues[field.name].get(value);
			if(indexRecordWithSameValue!=null && (indexRecordWithSameValue!==indexRecord)) result=("Field "+field.name+" unique values already has "+value+" value");
		}
		if(result==="success") result=checkValueToPutInField(field, value, this.#numberOutRange);
		return result;
	}
	/**
	 * Проверяет индекс, входит ли он в диапозон (переданное 2 число..переданное 3 число)
	 * @param {number} index 
	 * @param {number} from 
	 * @param {number} to 
	 */
	#checkIndexInRange(index, from, to){
		return ((index>=from) && (index<to));
	}
	/**
	 * Возвращает значение с учетом диапазонов.  
	 * Значение будет отличаться, при условии что оно вне диапозонов
	 * @param {DBField} field 
	 * @param {JStypesToDBValue} value 
	 */
	#validateValue(field, value){
		var result=value;
		if(this.#numberOutRange==="toRange"){
			switch(field.type){
				case "Uint8":
					if(value<0) result=0;
					if(value>255) result=255;
					break;
				case "Uint16":
					if(value<0) result=0;
					if(value>65535) result=65535;
					break;
				case "Uint16":
					if(value<0) result=0;
					if(value>16777215) result=16777215;
					break;
				case "Uint32":
					if(value<0) result=0;
					if(value>4_294_967_295) result=4_294_967_295;
					break;
				case "Int8":
					if(value<-128) result=-128;
					if(value>127) result=127;
					break;
				case "Int16":
					if(value<-32_768) result=-32768;
					if(value>32_767) result=32767;
					break;
				case "Int32":
					if(value<-2_147_483_648) result=-2_147_483_648;
					if(value>2_147_483_647) result=2_147_483_647;
					break;
				case "Float32":
					if(value<-16_777_215) result=-16_777_215;
					if(value>16_777_215) result=16_777_215;
					break;
				case "Float64":
					if(value<-9_007_199_254_740_991) result=-9_007_199_254_740_991;
					if(value>9_007_199_254_740_991) result=9_007_199_254_740_991;
					break;
				case "BigInt64":
					if(value<-9_223_372_036_854_775_808n) result=-9_223_372_036_854_775_808n;
					if(value>9_223_372_036_854_775_807n) result=9_223_372_036_854_775_807n;
					break;
				case "BigUint64":
					if(value<0n) result=0n;
					if(value>18_446_744_073_709_551_615n) result=18_446_744_073_709_551_615n;
					break;
			}
		}
		return result;
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
	 * @param {DBField} oldField 
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
						var pointer=dataViewOnOldBuffer.getFloat64(offset+1, this.#littleEndian);
						var value=this.#mapPointerToNoNumberValue.get(pointer);
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
				var pointer=dataViewOnOldBuffer.getFloat64(offset, this.#littleEndian);
				var value=this.#mapPointerToNoNumberValue.get(pointer);
				break;
			case "Uint8":
				var value=dataViewOnOldBuffer.getUint8(offset);
				break;
			case "Uint16":
				var value=dataViewOnOldBuffer.getUint16(offset, this.#littleEndian);
				break;
			case "Uint24":
				var value=dataViewOnOldBuffer.getUint24(offset, this.#littleEndian);
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
		}
		return value;
	}
	/**
	 * Устанавливает дефолт.значения полей, также делает их неудаляемыми сборщиком
	 */
	#setDefaultValuesToCache(){
		for(var i=0, maxI=this.#arrayFieldsAnyValues.length; (i<maxI); ++i){
			var field=this.#arrayFieldsAnyValues[i];
			var defaultValue=getDefaultValueFromFieldDescription(field);
			if(this.#objectFieldNameToDefaultValue===null) this.#objectFieldNameToDefaultValue={};
			this.#objectFieldNameToDefaultValue[field.name]=defaultValue;
			switch(field.type){
				case "Dynamic":
				case "String":
					switch(typeof defaultValue){
						case "string":
							if(!this.#mapNoNumberValueToCountUses.has(defaultValue)){
								this.#setCacheRecordAboutValue(defaultValue);
								this.#mapNoNumberValueToCountUses.set(defaultValue, Infinity);
							}
					}
					break;
			}
		}
	}
}
/**
 * Указатель на конкретную запись и конкретное ее поле
 */
class DBCursorToFieldByIndex{
	/** @type {DB_filling} */
	#db=null;
	#indexRecord=0;
	/** @type {DBField} */
	#field=null;
	#getValue=null;
	#setValue=null;
	#checkValue=null;
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
		return {field:this.#field.name, indexRecord:this.#indexRecord};
	}
}
/**
 * Вернет int байт по типу  
 * Если такого типа нет, выбросит ошибку
 * @param {DBValueTypes} type
 * @param {boolean} allowSpecialDataViewTypes 
 */
function getByteSizeFieldByType(type, allowSpecialDataViewTypes){
	var byteSize=0;
	switch(type){
		case "Uint24":
			if(allowSpecialDataViewTypes===false) throw Error(`Type ${type} no valid`);
			break;
	}
	switch(type){
		case "Uint8":
		case "Int8":
		case "Bool":
			byteSize=1;
			break;
		case "Uint16":
		case "Int16":
			byteSize=2;
			break;
		case "Uint24":
			byteSize=3;
			break;
		case "Uint32":
		case "Int32":
		case "Float32":
			byteSize=4;
			break;
		case "Float64":
		case "String":
		case "BigInt64":
		case "BigUint64":
			byteSize=8;
			break;
		case "Dynamic":
			byteSize=9;
			break;
		default: throw Error(`Type ${type} no valid`);
	}
	return byteSize;
}
/**
 * Проверка значения на допустимость вставки его в поле по типу
 * @param {DBField} field
 * @param {JStypesToDBValue} value 
 * @returns {'success' | string}
*/
function checkFieldTypeForValueType(field, value){
	var result="success";
	switch(field.type){
		case "Dynamic":
			switch(typeof value){
				case "string":
				case "number":
				case "boolean":
				case "bigint":
					break;
				default: result="Field "+field.name+" needs string|bool|number|bigint values"
			}
			break;
		case "String":
			if(typeof value!=="string") result="Field "+field.name+" needs string values";
			break;
		case "Uint8":
		case "Uint16":
		case "Uint32":
		case "Int8":
		case "Int16":
		case "Int32":
		case "Float32":
		case "Float64":
			if(typeof value!=="number") result="Field "+field.name+" needs number values";
			break;
		case "Bool":
			if(typeof value!=="boolean") result="Field "+field.name+" needs boolean values";
			break;
		case "BigInt64":
		case "BigUint64":
			if(typeof value!=="bigint") result="Field "+field.name+" needs bigint values";
			break;
	}
	return result;
}
/**
 * Проверить значения на допустимость вставки в поле (не проверяет уникальность значения для полей уникальных значений)  
 * Использовать **только** для проверки типов и диапазонов
 * @param {DBField} field 
 * @param {JStypesToDBValue} value 
 * @param {DBSettingNumberToRange} numberOutRange 
 * @returns {"success" | string}
 */
function checkValueToPutInField(field, value, numberOutRange){
	var result=checkFieldTypeForValueType(field, value);
	if(result==="success"){
		switch(field.type){
			case "String":
				break;
			case "Uint8":
			case "Uint24":
			case "Uint16":
			case "Uint32":
			case "Int8":
			case "Int16":
			case "Int32":
				if(!Number.isInteger(value)) result="Field with type "+field.type+" cant store no int value";
				break;
			case "Float32":
			case "Float64":
			case "BigInt64":
			case "BigUint64":
			case "Bool":
			case "Dynamic":
				break;
		}
	}
	if(result==="success"){
		if(numberOutRange==="error"){
			switch(field.type){
				case "Uint8":
					if(value<0) result=`value ${value} less than 0 (limit of Uint8)`;
					if(value>255) result=`value ${value} more than 255 (limit of Uint8)`;
					break;
				case "Uint16":
					if(value<0) result=`value ${value} less than 0 (limit of Uint16)`;
					if(value>65535) result=`value ${value} more than 65535 (limit of Uint16)`;
					break;
				case "Uint24":
					if(value<0) result=`value ${value} less than 0 (limit of Uint24)`;
					if(value>16777215) result=`value ${value} more than 16_777_215 (limit of Uint24)`;
					break;
				case "Uint32":
					if(value<0) result=`value ${value} less than 0 (limit of Uint32)`;
					if(value>4_294_967_295) result=`value ${value} more than 4_294_967_295 (limit of Uint32)`;
					break;
				case "Int8":
					if(value<-128) result=`value ${value} less than -128 (limit of Int8)`;
					if(value>127) result=`value ${value} more than 127 (limit of Int8)`;
					break;
				case "Int16":
					if(value<-32_768) result=`value ${value} less than -32_768 (limit of Int16)`;
					if(value>32_767) result=`value ${value} more than 32_767 (limit of Int16)`;
					break;
				case "Int32":
					if(value<-2_147_483_648) result=`value ${value} less than -2_147_483_648 (limit of Int32)`;
					if(value>2_147_483_647) result=`value ${value} more than 2_147_483_647 (limit of Int32)`;
					break;
				case "Float32":
					if(value<-16_777_215) result=`value ${value} less than -16_777_215 (limit of Float32)`;
					if(value>16_777_215) result=`value ${value} more than 16_777_215 (limit of Float32)`;
					break;
				case "Float64":
					if(value<-9_007_199_254_740_991) result=`value ${value} less than -9_007_199_254_740_991 (limit of Float64)`;
					if(value>9_007_199_254_740_991) result=`value ${value} more than 9_007_199_254_740_991 (limit of Float64)`;
					break;
				case "BigInt64":
					if(value<-9_223_372_036_854_775_808n) result=`value ${value} less than -9_223_372_036_854_775_808n (limit of BigInt64)`;
					if(value>9_223_372_036_854_775_807n) result=`value ${value} more than 9_223_372_036_854_775_807n (limit of BigInt64)`;
					break;
				case "BigUint64":
					if(value<0n) result=`value ${value} less than 0n (limit of BigUint64)`;
					if(value>18_446_744_073_709_551_615n) result=`value ${value} more than 18_446_744_073_709_551_615n (limit of BigUint64)`;
					break;
			}
		}
	}
	return result;
}
/**
 * @param {DBField[]} arrayFields 
 */
function checkFieldsForHaveThemFieldWithSpecificType(arrayFields){
	var result=false;
	for(var i=0; i<arrayFields.length; ++i){
		var field=arrayFields[i];
		switch(field.type){
			case "String":
			case "Dynamic":
				result=true;
				break;
		}
	}
	return result;
}
/**
 * Вернуть значение по умолчанию по типу из Хранилища
 * @param {DBValueTypes} type 
 * @returns {JStypesToDBValue}
 */
function getDefaultValueByType(type){
	switch(type){
		case "String":
			var value="";
			break;
		case "Dynamic":
		case "Uint8":
		case "Uint16":
		case "Uint32":
		case "Int8":
		case "Int16":
		case "Int32":
		case "Float32":
		case "Float64":
			var value=0;
			break;
		case "BigInt64":
		case "BigUint64":
			var value=0n;
			break;
		case "Bool":
			var value=false;
			break;
	}
	return value;
}
/**
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
function checkValueIsPositiveInteger(value){
	return ((Number.isInteger(value)) && (value>=0));
}
/**
 * @param {DBField} field 
 * @returns {JStypesToDBValue}
 */
function getDefaultValueFromFieldDescription(field){
	var fieldValue=field.defaultValue.value;
	switch(field.defaultValue.to){
		case "string":
			var value=fieldValue;
			break;
		case "number":
			var value=(+fieldValue);
			break;
		case "bigint":
			var value=BigInt(fieldValue);
			break;
		case "boolean":
			var value=(!!fieldValue);
			break;
	}
	return value;
}
/**
 * Расширенный объект DataView с парой методов для специфичных типов
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
//Public functions
/**
 * Создает поле любых значений хранилища
 * @param {string} name 
 * @param {DBValueTypes} type 
 * @param {JStypesToDBValue} [defaultValue] 
 */
function createFieldAnyValues(name, type, defaultValue=getDefaultValueByType(type)){
	var checking=getByteSizeFieldByType(type, true);
	/** @type {DBField} */
	var objectField={name, type, isFieldUniqueValues:false, defaultValue:{value:typeof defaultValue==="boolean"?(defaultValue?"true":""):defaultValue?.toString(), to: typeof defaultValue}};
	if(defaultValue!=null){
		var checking=checkFieldTypeForValueType(objectField, defaultValue);
		if(checking!=="success") throw Error(checking);
	} else {
		var value=getDefaultValueByType(objectField.type);
		objectField.defaultValue.value=typeof value==="boolean"?(defaultValue?"true":""):value?.toString();
		objectField.defaultValue.to=typeof value;
	}
	return objectField;
}
export {DataStorage, createFieldAnyValues, SymbolUseDefaultValue}