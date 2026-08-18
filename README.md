# DataStorageConstructor
Встраиваемое хранилище данных на чистом JS, без привязки к среде  
Подходит больше как хранилище для единых сущностей (по типу пользователей)  

Состояние: дорабатывание, исправление багов кода

# Основные качества
* Код работает на JS, без привязки к сторонним библиотекам, единственное требование: среда в которой вы будете запускать код, должна обладать движком поддерживающим EcmaScript 2025 (так как используется Resizable ArrayBuffer), и чтобы среда могла в файлы сохранять ArrayBuffer и JSON строки
* Вдохновлено Excel, как следствие структура выглядит как несколько заранее заданных полей и каждая добавляемая в хранилище запись будет обладать данными по типу, который присвоен полю.
* Хранимые типы данных: Number, немного BigInt, Bool и String (а также Dynamic)
* В коде используется Map объекты как кеши данных, для более быстрого их поиска в хранилище
* Строки хранятся в основном буффере как указатели, как следствие копий строк не создается, если 2 строки хранятся в двух разных записях
# Примеры использования:
Обычное применение:
```js
import {DataStorage, createFieldAnyValues} from "./DataStorageConstructor.mjs";
var db=DataStorage.create(0)
    .addFieldUniqueValues("Id","Uint32")
    .addFieldAnyValues("somedata", "String", "")
    .addFieldAnyValues("isAdmin", "Bool", false)
    .setCallbackAllocation(function(cur){
        this.allocateMemoryForRecords(100);
    })
    .endCreation();
//add record to storage
db.addRecordByObject({Id:-12910101, somedata:"myfriend"});
//change data in record
db.setRecordDataByObject(0, {somedata:"no more friend"});
//get data all records
db.getRecordsData();
//get buffer for save
db.getBuffer();
//get info for save
db.getInfo();
```
