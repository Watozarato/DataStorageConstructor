var log=console.log;
/** @typedef {number} int */
/** @typedef {"UTF-8" | "UTF-16"} encodingTypeString*/
/** @typedef {"Uint8" | "Uint16" | "Uint32" | "Int8" | "Int16" | "Int32" | "BigInt64" | "BigUint64"} numberType*/
/** @typedef {numberType | encodingTypeString | "bool"} typesValueOfField */
/**
 * @typedef {object} ObjectSettingsOnStartCreationDB
 * @property {boolean} littleEndian
 * @property {int} allocatedRecords
 * @property {function} callbackAllocation
 */
/**
 * @typedef {object} ElementOfHeader
 * @property {string} name
 * @property {typesValueOfField} type
 * @property {number | string | boolean} [defaultValue?]
 */
/**
 * @callback callbackAllocation
 * @this DB_filling
 * @param {number} currentRecords
 * @param {number} maxRecords
 */
/**
 * @typedef {object} Field
 * @property {string} name
 * @property {typesValueOfField} type
 * @property {boolean} isFieldUniqueValues
 * @property {int} offset
 * @property {int} byteLength
 */
/** @typedef {number | string | boolean} FieldValue*/
var DB={
	/**
	 * Начать создание БД  
	 * Аргументы метода:  
	 * **maxRecords** - максимум записей в БД (int)  
	 * **objectSettings** - объект со свойствами:  
	 * * littleEndian? - порядок записи байт  
	 * * allocatedRecords? - начальный предел записей
	 * * callbackAllocation? - функция, которая будет вызываться когда кол-во записей станет равно кол-ву выделенных записей
	 * @param {int} maxRecords 
	 * @param {ObjectSettingsOnStartCreationDB} objectSettings
	 */
	create(maxRecords, objectSettings){
        return new DB_creation(maxRecords, objectSettings);
	},
	createFrom(dataJSON, buffer){
		return new DB_filling();
	}
}
class DB_creation{
	#header=null;
	#arrayHeaderFields=[];
	#fields={};
	#arrayFields=[];
	#maxRecords=0;
	#allocatedRecords=0;
	#byteSizePerRecord=0;
	#headerByteLength=0;
	#littleEndian=false;
	#callbackAllocation=null;
	#indexLastFieldUniqueValues=-1;
	constructor(maxRecords, objectSettings){
		this.#maxRecords=maxRecords;
		if(objectSettings?.littleEndian) this.#littleEndian=(!!objectSettings.littleEndian);
		if(typeof objectSettings?.allocatedRecords==="number") this.#allocatedRecords=objectSettings.allocatedRecords;
	}
	/**
	 * Задать поля для "заголовка"  
	 * Условно это один простой объект
	 * @param  {...ElementOfHeader} objectsDescription
	 */
	setHeader(...objectsDescription){
		this.#header=null;
		this.#headerByteLength=0;
		var objectResult={};
		for(var object of objectsDescription){
			if(typeof object.name!=="string") throw Error("Не задано имя поля в header");
			if(typeof object.type!=="string") throw Error("Не задан type поля в header");
			var defaultValue=object.defaultValue;
			switch (typeof object.defaultValue) {
				case "number":
					switch(object.type){
						case "UTF-8":
						case "UTF-16":
						case "bool":
							throw Error("Не соответствует defaultValue с type поля в header");
						case "BigInt64":
						case "BigUint64":
							throw Error("Установлен type принимающий BigInt значения, а получено number");
						default: break;
					}
					break;
				case "string":
					switch(object.type){
						case "UTF-8":
						case "UTF-16":
							break;
						default: throw Error("Не соответствует defaultValue с type поля в header");
					}
					break;
				case "boolean":
					switch(object.type){
						case "bool": break;
						default: throw Error("Не соответствует defaultValue с type поля в header");
					}
					break;
				default:
					switch(object.type){
						case "Uint8":
						case "Uint16":
						case "Uint32":
						case "Int8":
						case "Int16":
						case "Int32":
							defaultValue=0;
							break;
						case "BigUint64":
						case "BigInt64":
							defaultValue=0n;
							break;
						case "UTF-8":
						case "UTF-16":
							defaultValue="";
							break;
						case "bool":
							defaultValue=false;
							break;
					}
					break;
			}
			var byteLength=getByteSizeFromType(object.type);
			var objectField={
				name:object.name,
				type:object.type,
				defaultValue,
				offset:this.#headerByteLength,
				byteLength
			};
			objectResult[object.name]=objectField;
			this.#arrayHeaderFields.push(objectField);
			this.#headerByteLength+=byteLength;
		}
		this.#header=objectResult;
		return this;
	}
	/**
	 * Добавить поле уникальных Number значений
	 * @param {string} fieldName 
	 * @param {numberType} numberType 
	 */
	addFieldUniqueNumberValues(fieldName, numberType){
		if(this.#fields[fieldName]) throw Error("Поле с именем "+fieldName+"уже существует");
		var byteLength=getByteSizeFromType(numberType);
		var fieldObject={
			name:fieldName,
			type:numberType,
			isFieldUniqueValues:true,
			offset:this.#byteSizePerRecord,
			byteLength
		};
		this.#arrayFields.push(fieldObject)
		this.#fields[fieldName]=fieldObject;
		this.#indexLastFieldUniqueValues=(this.#arrayFields.length-1);
		this.#byteSizePerRecord+=byteLength;
		return this;
	}
	/**
	 * Добавить поле любых Number значений
	 * @param {string} fieldName 
	 * @param {numberType} numberType 
	 */
    addFieldAnyNumberValues(fieldName, numberType, defaultValue=0){
		if(this.#fields[fieldName]) throw Error("Поле с именем "+fieldName+"уже существует");
		var byteLength=getByteSizeFromType(numberType);
		var fieldObject={
			name:fieldName,
			type:numberType,
			defaultValue,
			isFieldUniqueValues:false,
			offset:this.#byteSizePerRecord,
			byteLength
		};
		this.#arrayFields.push(fieldObject)
		this.#fields[fieldName]=fieldObject;
		this.#byteSizePerRecord+=byteLength;
		return this;
	}
	/**
	 * Добавить поле уникальных String значений
	 * @param {string} fieldName 
	 * @param {encodingTypeString} encodingType
	 */
	addFieldUniqueStringValues(fieldName, encodingType){
		if(this.#fields[fieldName]) throw Error("Поле с именем "+fieldName+"уже существует");
		var byteLength=getByteSizeFromType(encodingType);
		var fieldObject={
			name:fieldName,
			type:numberType,
			defaultValue,
			isFieldUniqueValues:true,
			offset:this.#byteSizePerRecord,
			byteLength
		};
		this.#arrayFields.push(fieldObject)
		this.#fields[fieldName]=fieldObject;
		this.#indexLastFieldUniqueValues=(this.#arrayFields.length-1);
		this.#byteSizePerRecord+=byteLength;
		return this;
	}
	/**
	 * Добавить поле любых String значений
	 * @param {string} fieldName 
	 * @param {encodingTypeString} encodingType
	 */
    addFieldAnyStringValues(fieldName, encodingType, defaultValue=""){
		if(this.#fields[fieldName]) throw Error("Поле с именем "+fieldName+"уже существует");
		var byteLength=getByteSizeFromType(encodingType);
		var fieldObject={
			name:fieldName,
			type:numberType,
			defaultValue,
			isFieldUniqueValues:false,
			offset:this.#byteSizePerRecord,
			byteLength
		};
		this.#arrayFields.push(fieldObject)
		this.#fields[fieldName]=fieldObject;
		this.#byteSizePerRecord+=byteLength;
		return this;
	}
	/**
	 * Установить функцию-колбек для вызова при заполнении выделенной памяти    
	 * - **currentRecords**: Текущее количество записей     
	 * - **maxRecords**: Предел записей в БД  
	 * @param {callbackAllocation} func
	 */
	setCallbackAllocation(func){
		if(typeof func!=="function") throw Error("Передана не функция");
		this.#callbackAllocation=func;
		return this;
	}
	/**
	 * Закончить настройку БД  
	 * Выбросит ошибку при вызове, если callbackAllocation не задан
	 */
	endCreation(){
		if(!this.#callbackAllocation) throw Error("Не задан callbackAllocation");
		return new DB_filling(this.#maxRecords, {
			fields:this.#fields,
			header:this.#header,
			littleEndian:this.#littleEndian,
			byteSizePerRecord:this.#byteSizePerRecord,
			headerByteLength:this.#headerByteLength,
			callbackAllocation:this.#callbackAllocation,
			arrayFields:this.#arrayFields,
			indexLastFieldUniqueValues:this.#indexLastFieldUniqueValues,
			arrayHeaderFields:this.#arrayHeaderFields
		});
	}
}
class DB_filling{
	//Кеш полей любых значений
	/**
	 * Object, где ключ - имя поля, значение - Map в котором:  
	 * Ключ - значение, значение - Коллекция Set из индексов записей
	 * @type{Object<string, Map<number | BigInt, Set<int>>>}
	*/
	#cacheOfFieldsNumbericAnyValues={};
	/**
	 * Object, где ключ - имя поля, значение - Map в котором:  
	 * Ключ - строка, значение - Коллекция Set из индексов записей
	 * @type{Object<string, Map<string, Set<int>>>}
	 */
	#cacheOfFieldsStringUTF8AnyValues={};
	/**
	 * Object, где ключ - имя поля, значение - Map в котором:  
	 * Ключ - строка, значение - Коллекция Set из индексов записей
	 * @type{Object<string, Map<string, Set<int>>>}
	 */
	#cacheOfFieldsStringUTF16AnyValues={};
	/**
	 * Object, где ключ - имя поля, значение - Set, в котором индексы полей, где значение true
	 * @type{Object<string, Set<number>>}
	 */
	#cacheOfFieldsBooleanAnyValues={};
	//Кеш уникальных значений
	/**
	 * Object, где ключ - имя поля, значение - Map в котором:  
	 * Ключ - значение, значение - индекс записи
	 * @type{Object<string, Map<number | BigInt, int>>}
	*/
	#cacheOfFieldsNumbericUniqueValues={};
	/**
	 * Object, где ключ - имя поля, значение - Map в котором:  
	 * Ключ - строка, значение - индекс записи
	 * @type{Object<string, Map<string, int>>}
	 */
	#cacheOfFieldsStringUTF8UniqueValues={};
	/**
	 * Object, где ключ - имя поля, значение - Map в котором:  
	 * Ключ - строка, значение - индекс записи
	 * @type{Object<string, Map<string, int>>}
	 */
	#cacheOfFieldsStringUTF16UniqueValues={};
	//Указатели к значениям
	/**
	 * Map, где ключ - строка, значение - number 4 байтовое (указатель)
	 * @type {Map<string, number>}
	*/
	#mapUTF8stringToPointer=new Map();
	/**
	 * Map, где ключ - строка, значение - number 4 байтовое (указатель)
	 * @type {Map<string, number>}
	*/
	#mapUTF16stringToPointer=new Map();
	//Работа с заголовком
	/** @type {Object<string,ElementOfHeader>} */
	#header=null;
	/** @type {ElementOfHeader[]} */
	#arrayHeaderFields=null;
	#headerByteLength=0;
	//Буфер наш
	/** @type {ArrayBuffer} */
	#buffer=null;
	/** @type {DataView} */
	#dataView=null;
	#littleEndian=false;
	/** @type {Object<string, Field>} */
	#fields=null;
	/** @type {Field[]} */
	#arrayFields=null;
	/**
	 * Object, где ключ - имя поля, значение - объект Field
	 * @type {Object<string, Field>}
	*/
	#fieldsUniqueValues={};
	/** @type {Field[]} */
	#arrayFieldsUniqueValues=[];
	#countFieldsUniqueValues=0;
	#indexLastFieldUniqueValues=-1;
	/**
	 * Object, где ключ - имя поля, значение - объект Field
	 * @type {Object<string, Field>}
	*/
	#fieldsAnyValues={};
	#allocatedRecords=0;
	#byteSizePerRecord=0;
	/** @type {callbackAllocation} */
	#callbackAllocation=null;
	#recordsCount=0;
	#maxRecords=0;
	[Symbol.toStringTag]="DataBase";
	constructor(maxRecords, objectSettings){
		this.#callbackAllocation=objectSettings.callbackAllocation;
		this.#maxRecords=maxRecords;
		this.#byteSizePerRecord=objectSettings.byteSizePerRecord;
		this.#fields=objectSettings.fields;
		this.#indexLastFieldUniqueValues=objectSettings.indexLastFieldUniqueValues;
		this.#arrayFields=objectSettings.arrayFields;
		this.#arrayHeaderFields=objectSettings.arrayHeaderFields;
		//Обрабатываем поля и подготавливаем кеш-поля
		for(var nameOfField in this.#fields){
			var localfield=this.#fields[nameOfField];
			if(localfield.isFieldUniqueValues){
				this.#arrayFieldsUniqueValues.push(localfield);
				++this.#countFieldsUniqueValues;
				this.#fieldsUniqueValues[localfield.name]=localfield;
				switch(localfield.type){
					case "UTF-8":
						this.#cacheOfFieldsStringUTF8UniqueValues[localfield.name]=new Map();
						break;
					case "UTF-16":
						this.#cacheOfFieldsStringUTF16UniqueValues[localfield.name]=new Map();
						break;
					case "Uint8":
					case "Uint16":
					case "Uint32":
					case "Int8":
					case "Int16":
					case "Int32":
					case "BigInt64":
					case "BigUint64":
						this.#cacheOfFieldsNumbericUniqueValues[localfield.name]=new Map();
						break;
				}
			} else {
				this.#fieldsAnyValues[localfield.name]=localfield;
				switch(localfield.type){
					case "UTF-8":
						this.#cacheOfFieldsStringUTF8AnyValues[localfield.name]=new Map();
						break;
					case "UTF-16":
						this.#cacheOfFieldsStringUTF16AnyValues[localfield.name]=new Map();
						break;
					case "Uint8":
					case "Uint16":
					case "Uint32":
					case "Int8":
					case "Int16":
					case "Int32":
					case "BigInt64":
					case "BigUint64":
						this.#cacheOfFieldsNumbericAnyValues[localfield.name]=new Map();
						break;
					case "bool":
						this.#cacheOfFieldsBooleanAnyValues[localfield.name]=new Set();
						break;
				}
			}
		}
		this.#littleEndian=(!!objectSettings.littleEndian);
		if(objectSettings.buffer){
			//Здесь парсим буффер
		}
		if(objectSettings.header){
			this.#header=objectSettings.header;
			this.#headerByteLength=objectSettings.headerByteLength;
		}
		this.#buffer=new ArrayBuffer(this.#headerByteLength+(this.#allocatedRecords*this.#byteSizePerRecord),{maxByteLength:this.#headerByteLength+(this.#maxRecords*this.#byteSizePerRecord)});
		this.#dataView=new DataView(this.#buffer);
	}
	//Добавление записей в БД
	/**
	 * Добавить запись в БД
	 * @param  {FieldValue} values
	 */
	addRecord(...values){
		var lengthValues=values.length;
		var currentIndexOfAddingRecord=this.#recordsCount;
		if(values.length<=this.#indexLastFieldUniqueValues) throw Error("Не все поля уникальных значений указаны");
		for(var i=0; i<lengthValues; ++i){
			var value=values[i];
			this.#checkTypeOfValueWithField(this.#arrayFields[i], value);
			if(this.#arrayFields[i].isFieldUniqueValues){
				this.#checkValueInCacheFieldUniqueValues(this.#arrayFields[i], value);
			}
		}
		for(var i=0; i<lengthValues; ++i){
			var localfield=this.#arrayFields[i];
			this.#addValueInDB(this.#recordsCount, this.#arrayFields[i], values[i]);
		}
		++this.#recordsCount;
		if(this.#recordsCount>=this.#allocatedRecords) this.#callbackAllocation.call(this, this.#recordsCount,this.#maxRecords);
		return this;
	}
	//Выделить память
	/**
	 * Увеличить память под новые записи  
	 * Возвращает новый предел записей  
	 * @param {int} count 
	 */
	allocateMemoryForRecords(count){
		if((this.#allocatedRecords+count)>this.#maxRecords) throw Error("Выделить память нельзя - перейдете лимит");
		this.#allocatedRecords+=count;
		this.#buffer.resize(this.#headerByteLength+(this.#allocatedRecords*this.#byteSizePerRecord));
		this.#dataView=new DataView(this.#buffer);
		return this.#allocatedRecords;
	}
	//Задать данные в БД
	setDataOfRecord(indexRecord, ...values){
		var lengthValues=values.length;
		for(var i=0; i<lengthValues; ++i){
			var value=values[i];
			this.#checkTypeOfValueWithField(this.#arrayFields[i], value);
			if(this.#arrayFields[i].isFieldUniqueValues){
				this.#checkValueInCacheFieldUniqueValues(this.#arrayFields[i], value, indexRecord);
			}
		}
		for(var i=0; i<lengthValues; ++i){
			var localfield=this.#arrayFields[i];
			this.#setValueInDB(indexRecord, this.#arrayFields[i], values[i]);
		}
		return this;
	}
	//Получение данных в БД
	getDataOfRecord(indexRecord){
	}
	getDBInfo(){
		var objectResult={
			header:[
				...this.#arrayHeaderFields
			],
			fields:[
				...this.#arrayFields
			],
			byteSizePerRecord:this.#byteSizePerRecord
		};
		return objectResult;
	}
	/**
	 * Создает массив из объектов в каждом из которых данные с БД
	 */
	getDataByObjects(min=0, max=this.#recordsCount){
		if(min<0) throw RangeError("Параметр min меньше, чем 0");
		if(max>this.#recordsCount) throw RangeError("Параметр max больше, чем кол-во записей в БД");
		var result=new Array(this.#recordsCount);
		for(var i=min; i<max; ++i){
			var objectToResult={};
			for(var localfield of this.#arrayFields){
				var localoffset=(i*this.#byteSizePerRecord)+localfield.offset;
				objectToResult[localfield.name]=this.#getValueInDB(i, localfield);
			}
			result[i]=objectToResult;
		}
		return result;
	}
	/**
	 * Генерирует ArrayBuffer с данными, который вы можете использовать, чтобы сохранить  
	 * Манипулирование этим ArrayBuffer не влияет на БД
	 */
	getBuffer(){
		return this.#buffer.slice();
	}
	/**
	 * Выбросит ошибку если тип значения не соответствует типу поля в БД
	 * @param {Field} field 
	 * @param {number | string | boolean} value 
	 */
	#checkTypeOfValueWithField(field, value){
		if(value!==null){
			switch(field.type){
				case "UTF-8":
				case "UTF-16":
					if(typeof value!=="string") throw Error(`Несоответствующий тип данных - ожидалось ${field.type}`);
					break;
				case "Uint8":
				case "Uint16":
				case "Uint32":
				case "Int8":
				case "Int16":
				case "Int32":
				case "Float16":
				case "Float32":
				case "Float64":
					if(typeof value!=="number") throw Error(`Несоответствующий тип данных - ожидалось ${field.type}`);
					break;
				case "BigInt64":
				case "BigUint64":
					if(typeof value!=="bigint") throw Error(`Несоответствующий тип данных - ожидалось ${field.type}`);
					break;
			}
		}
	}
	/**
	 * @param {Field} field 
	 * @param {number | string} value 
	 * @param {int} indexRecord 
	 */
	#checkValueInCacheFieldUniqueValues(field, value, indexRecord){
		if(value!==null){
			switch(field.type){
				case "Uint8":
				case "Uint16":
				case "Uint32":
				case "Int8":
				case "Int16":
				case "Int32":
				case "BigInt64":
				case "BigUint64":
					if((indexRecord>=0) && value===this.#getValueInDB(indexRecord, field)) break;
					if(this.#cacheOfFieldsNumbericUniqueValues[field.name].has(value)) throw Error("Значение "+value+" уже есть в поле уникальных значений: "+field.name);
					break;
				case "UTF-8":
				case "UTF-16":
				case "bool":
					break;
			}
		}
	}
	/**
	 * Получить размер в байтах для строки в кодировке UTF-8
	 * @param {string} string16 
	 * @returns {int}
	 */
	#getLengthOfUTF8(string16){
		var result=0;
		for(var char of string16){
			var codePoint=char.codePointAt(0);
			if(codePoint<=127) result+=1;
			else if(codePoint<2048) result+=2;
			else if(codePoint<65536) result+=3;
			else result+=4;
		}
		return result;
	}
	//Работа с кешем
	/**
	 * Добавить значение в кеше значений поля
	 * @param {int} indexRecord
	 * @param {Field} field
	 * @param {FieldValue} value
	*/
	#addValueInDB(indexRecord, field, value){
		var cacheField=null;
		var cacheOfValue=null;
		var localoffset=(indexRecord*this.#byteSizePerRecord)+field.offset;
		switch(field.type){
			case "Uint8":
			case "Uint16":
			case "Uint32":
			case "Int8":
			case "Int16":
			case "Int32":
			case "BigInt64":
			case "BigUint64":
				if(field.isFieldUniqueValues){
					cacheField=this.#cacheOfFieldsNumbericUniqueValues[field.name];
					cacheField.set(value, indexRecord);
				} else {
					cacheField=this.#cacheOfFieldsNumbericAnyValues[field.name];
					cacheOfValue=cacheField.get(value);
					if(!cacheOfValue){
						cacheOfValue=new Set();
						cacheField.set(value, cacheOfValue);
					}
				}
				switch(field.type){
					case "Uint8":
						this.#dataView.setUint8(localoffset, value);
						break;
					case "Uint16":
						this.#dataView.setUint16(localoffset, value, this.#littleEndian);
						break;
					case "Uint32":
						this.#dataView.setUint32(localoffset, value, this.#littleEndian);
						break;
					case "Int8":
						this.#dataView.setInt8(localoffset, value);
						break;
					case "Int16":
						this.#dataView.setInt16(localoffset, value, this.#littleEndian);
						break;
					case "Int32":
						this.#dataView.setInt32(localoffset, value, this.#littleEndian);
						break;
					case "BigInt64":
						this.#dataView.setBigInt64(localoffset, value, this.#littleEndian);
						break;
					case "BigUint64":
						this.#dataView.setBigUint64(localoffset, value, this.#littleEndian);
						break;
				}
				break;
			case "UTF-8":
				if(field.isFieldUniqueValues){
					cacheField=this.#cacheOfFieldsStringUTF8UniqueValues[field.name];
				} else {
					cacheField=this.#cacheOfFieldsStringUTF8AnyValues[field.name];
					cacheOfValue=cacheField.get();
				}
				var pointer=this.#mapUTF8stringToPointer;
				this.#dataView.setUint32(localoffset, pointer);
				break;
			case "UTF-16":
			case "bool":
		}
	}
	/**
	 * @param {int} indexRecord 
	 * @param {Field} field 
	 */
	#getValueInDB(indexRecord, field){
		var result;
		var localoffset=(indexRecord*this.#byteSizePerRecord)+field.offset;
		switch(field.type){
			case "Uint8":
				result=this.#dataView.getUint8(localoffset);
				break;
			case "Uint16":
				result=this.#dataView.getUint16(localoffset, this.#littleEndian);
				break;
			case "Uint32":
				result=this.#dataView.getUint32(localoffset, this.#littleEndian);
				break;
			case "Int8":
				result=this.#dataView.getInt8(localoffset);
				break;
			case "Int16":
				result=this.#dataView.getInt16(localoffset, this.#littleEndian);
				break;
			case "Int32":
				result=this.#dataView.getInt32(localoffset, this.#littleEndian);
				break;
			case "BigInt64":
				result=this.#dataView.getBigInt64(localoffset, this.#littleEndian);
				break;
			case "BigUint64":
				result=this.#dataView.getBigUint64(localoffset, this.#littleEndian);
				break;
			case "UTF-8":
			case "UTF-16":
			case "bool":
				break;
		}
		return result;
	}
	/**
	 * 
	 * @param {int} indexRecord 
	 * @param {Field} field 
	 * @param {typesValueOfField} value 
	 */
	#setValueInDB(indexRecord, field, value){
		var cacheField=null;
		var cacheFieldOldValue=null;
		var oldValue;
		var localoffset=(indexRecord*this.#byteSizePerRecord)+field.offset;
		if(value===null) return;
		switch(field.type){
			case "Uint8":
			case "Uint16":
			case "Uint32":
			case "Int8":
			case "Int16":
			case "Int32":
			case "BigInt64":
			case "BigUint64":
				if(field.isFieldUniqueValues){
					cacheField=this.#cacheOfFieldsNumbericUniqueValues[field.name];
					cacheField.delete(this.#getValueInDB(indexRecord, field));
					cacheField.set(value, indexRecord);
				} else {
					cacheField=this.#cacheOfFieldsNumbericAnyValues[field.name];
					oldValue=this.#getValueInDB(indexRecord, field);
					cacheFieldOldValue=cacheField.get(oldValue);
					cacheFieldOldValue.delete(indexRecord);
					if(cacheFieldOldValue.size===0) cacheField.delete(oldValue);
					cacheOfValue=cacheField.get(value);
					if(!cacheOfValue){
						cacheOfValue=new Set();
						cacheField.set(value, cacheOfValue);
					}
				}
				switch(field.type){
					case "Uint8":
						this.#dataView.setUint8(localoffset, value);
						break;
					case "Uint16":
						this.#dataView.setUint16(localoffset, value, this.#littleEndian);
						break;
					case "Uint32":
						this.#dataView.setUint32(localoffset, value, this.#littleEndian);
						break;
					case "Int8":
						this.#dataView.setInt8(localoffset, value);
						break;
					case "Int16":
						this.#dataView.setInt16(localoffset, value, this.#littleEndian);
						break;
					case "Int32":
						this.#dataView.setInt32(localoffset, value, this.#littleEndian);
						break;
					case "BigInt64":
						this.#dataView.setBigInt64(localoffset, value, this.#littleEndian);
						break;
					case "BigUint64":
						this.#dataView.setBigUint64(localoffset, value, this.#littleEndian);
						break;
				}
				break;
			case "UTF-8":
			case "UTF-16":
			case "bool":
		}
	}
}
/**
 * 
 * @param {numberType | encodingTypeString | "bool"} type 
 * @param {number | string | boolean} value 
 */
function checkTypeValue(type, value){
	switch(typeof value){
		case "number":
			switch(type){
				case "UTF-8":
				case "UTF-16":
				case "BigInt64":
				case "BigUint64":
				case "bool":
					throw Error("Не соответствующий тип значения");
				default: break;
			}
			break;
		case "bigint":
			switch(type){
				case "BigInt64":
				case "BigUint64":
					break;
				default: throw Error("Не соответствующий тип значения");
			}
			break;
		case "string":
			switch(type){
				case "UTF-8":
				case "UTF-16":
					break;
				default: throw Error("Не соответствующий тип значения");
			}
			break;
		case "boolean":
			if(type!=="bool") throw Error("Не соответствующий тип значения");
			break;
		default: throw Error("Не существующий в БД тип значения")
	}
}
function getByteSizeFromType(type){
	var value=0;
	switch(type){
		case "Uint8":
		case "Int8":
			value=1;
			break;
		case "Uint16":
		case "Int16":
		case "Float16":
			value=2;
			break;
		case "Uint32":
		case "Int32":
		case "Float32":
		case "UTF-8":
		case "UTF-16":
			value=4;
			break;
		case "Float64":
		case "BigUint64":
		case "BigInt64":
			value=8;
			break;
		default: throw Error("Неизвестный тип");
	}
	return value;
}
export {DB};