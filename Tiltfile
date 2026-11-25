# The whole stack on minikube with live reload: `make tilt-up`, then edit and save.
#
# Tilt builds the api image, applies the dev overlay, forwards the ports and, on every save under
# api/src, copies the file into the running api and worker containers instead of rebuilding.
# The Tilt UI is at http://localhost:10350.

if k8s_context() != 'minikube':
    fail('This Tiltfile only deploys to minikube; the current context is %r.' % k8s_context())

KUBECTL = 'kubectl --context minikube --namespace docchat-dev'

# The API keys reach the cluster from api/.env and never from a file in the repository. Runs
# again whenever api/.env changes.
local_resource('api-keys', cmd='make secrets-dev', deps=['api/.env'], labels=['setup'])

k8s_yaml(kustomize('deploy/k8s/overlays/dev'))

docker_build(
    'docchat-api',
    context='api',
    target='dev',
    live_update=[
        # A dependency change needs a new image; anything else is a file copy.
        fall_back_on(['api/pyproject.toml', 'api/uv.lock']),
        sync('api/src', '/app/src'),
    ],
)

k8s_resource(
    'docchat-api',
    port_forwards=['8000:8000'],
    resource_deps=['api-keys', 'docchat-redis'],
    links=[link('http://localhost:8000/docs', 'Swagger UI')],
    labels=['app'],
)
k8s_resource('docchat-worker', resource_deps=['api-keys', 'docchat-redis'], labels=['app'])
# 15432 on this machine, clear of a local Postgres on 5432 and of the usual tunnels.
k8s_resource('docchat-postgres', port_forwards=['15432:5432'], labels=['data'])
k8s_resource('docchat-redis', port_forwards=['6379:6379'], labels=['data'])
# Buttons in the UI: they run only when clicked.
local_resource(
    'api-tests',
    cmd='make test',
    trigger_mode=TRIGGER_MODE_MANUAL,
    auto_init=False,
    labels=['verify'],
)
# Copies the sample PDF into the api pod and queues it; the worker's log shows the ingestion. A
# fixed id, so running it again replaces the sample instead of adding a copy.
local_resource(
    'ingest-sample',
    cmd=(
        KUBECTL + ' exec -i deploy/docchat-api -- sh -c "cat > /tmp/sample.pdf"'
        + ' < api/evals/golden/sample.pdf && '
        + KUBECTL + ' exec deploy/docchat-api -- docchat ingest /tmp/sample.pdf'
        + ' --pdf-id b5a044be-24a9-4424-9065-9388c68e1323'
    ),
    trigger_mode=TRIGGER_MODE_MANUAL,
    auto_init=False,
    resource_deps=['docchat-api', 'docchat-worker'],
    labels=['verify'],
)
