# FastAPI 实战总结 & 坑点指南

## 一、APIRouter 的正确姿势

项目大了别把所有路由堆在 `main.py`，用 `APIRouter` 分模块：

```python
# routers/user.py
from fastapi import APIRouter

router = APIRouter(prefix="/users", tags=["users"])  # prefix 统一前缀

@router.get("/{user_id}")   # 实际路径 /users/{user_id}
def get_user(user_id: int):
    return {"id": user_id}

# main.py
from routers import user
app.include_router(user.router)
```

**坑点 1**：`prefix="/users"` 后，路由里写 `"/{user_id}"` 而不是 `"/users/{user_id}"`，否则路径变成 `/users/users/xxx` 喵！

**坑点 2**：路由注册顺序很重要！`/users/me` 要写在 `/users/{user_id}` **前面**，否则 `me` 会被当成 `user_id` 匹配走（还会报类型转换错误）。

## 二、参数到底从哪来（最容易混）

FastAPI 按**声明方式**自动判断参数来源：

```python
from fastapi import Query, Path, Body
from pydantic import BaseModel

class Item(BaseModel):
    name: str
    price: float

@app.get("/items/{item_id}")
def read_item(
    item_id: int = Path(...),        # 路径参数 /items/3
    q: str | None = Query(None),     # 查询参数 ?q=abc
):
    ...

@app.post("/items")
def create_item(item: Item):          # Pydantic 模型 → 自动从 body 解析
    ...
```

**坑点 3**：POST 里想同时收 body + query 参数，直接混着声明就行，但**简单类型默认是 query，模型类型默认是 body**。如果 POST 里写个 `name: str` 想从 body 收，要用 `Body(...)` 显式声明，否则前端传 body 你收不到喵！

**坑点 4**：多个 body 参数要包一层模型，或者用 `Body(embed=True)`，不然 FastAPI 会把它们拆散。

## 三、请求方法选择（REST 习惯）

| 方法 | 场景 | 前端 fetch |
|---|---|---|
| GET | 查询、获取 | 默认就是 GET |
| POST | 创建、提交、登录 | `method: 'POST'` + body |
| PUT | 整体更新 | 同上 |
| PATCH | 部分更新 | 同上 |
| DELETE | 删除 | `method: 'DELETE'` |

## 四、高频坑点清单

1. **CORS 跨域**：前端 fetch 报 `CORS error` 是新手第一坑，后端必须加：
```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # 前端地址，别用 * 配 credentials
    allow_methods=["*"],
    allow_headers=["*"],
)
```

2. **前端 POST 忘了加 header**：`headers: {'Content-Type': 'application/json'}` 不加的话，FastAPI 解析 body 会 422。

3. **422 错误**：FastAPI 参数校验失败默认返回 422（不是 400），看到 422 就去查字段类型/必填项。

4. **async 混用**：路由用 `async def` 时，里面别调用**同步阻塞**的库（如 `requests`、`time.sleep`），会卡死整个事件循环。要么用 `httpx`，要么改成普通 `def`（FastAPI 会放线程池跑）。

5. **返回 datetime/Decimal 报错**：用 Pydantic 的 `response_model` 声明返回模型，FastAPI 会自动序列化：
```python
@app.get("/items", response_model=list[ItemOut])
```

6. **依赖注入 Depends**：数据库会话、鉴权统一用 `Depends`，别在每个路由里手写：
```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/users")
def list_users(db: Session = Depends(get_db)):
    ...
```

7. **文件上传**：用 `UploadFile = File(...)`，且前端要用 `FormData`，不能发 JSON。

8. **路径末尾斜杠**：`/users` 和 `/users/` 是两个路由，FastAPI 默认会 307 重定向，前端 fetch 时重定向可能丢 POST body，建议统一不加尾斜杠。

## 五、调试神器

- 自带文档：`http://localhost:8000/docs`（Swagger UI），可以直接在页面里测接口，比前端 fetch 调试快得多喵！
- 备选：`/redoc`

---

总结一句话：**参数来源看声明类型、422 查字段、CORS 先配好、路由顺序注意、async 里别阻塞**喵~ 有具体代码问题也可以贴给我看看！🐾