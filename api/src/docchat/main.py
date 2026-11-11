from importlib.metadata import version

from fastapi import FastAPI


def create_app() -> FastAPI:
    return FastAPI(title="DocChat API", version=version("docchat"))


app = create_app()
