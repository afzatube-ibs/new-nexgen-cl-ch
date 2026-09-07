# neXgen Core — Application Unit / Background Worker image
#
# Both the Application Unit (php-fpm, fronted by nginx) and the Background
# Worker (php artisan queue:work) run from this same image, per
# ARCH:DEPLOYMENT_TOPOLOGY — they are the same stateless codebase, distinguished
# only by which process the container runs (see docker-compose.yml `command`
# overrides). This keeps the two in lockstep by construction: there is no way
# for the worker to drift onto a different build of the code than the web
# process, which would otherwise be a silent source of behavioral divergence.
#
# Built to satisfy ADR-0002 (PHP 8.4+ / Laravel) and ADR-0008 (Docker
# packaging, no orchestration platform assumed at this level).

ARG PHP_VERSION=8.4

# --- Stage 1: composer dependencies -----------------------------------------
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
# Scripts (artisan package:discover) need the full app present, so defer
# --no-scripts to this stage and let the runtime stage re-run install.
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --no-scripts \
    --prefer-dist \
    --optimize-autoloader

# --- Stage 2: runtime ---------------------------------------------------------
FROM php:${PHP_VERSION}-fpm-alpine AS runtime

# Runtime and build dependencies for the PHP extensions Laravel + MySQL +
# Redis require. Build-only packages are removed in the same layer via
# --virtual so the final image does not carry a compiler toolchain.
RUN apk add --no-cache \
        icu-libs \
        libzip \
        oniguruma \
        libpng \
        libjpeg-turbo \
        freetype \
        supervisor \
        curl \
    && apk add --no-cache --virtual .build-deps \
        $PHPIZE_DEPS \
        icu-dev \
        libzip-dev \
        oniguruma-dev \
        libpng-dev \
        libjpeg-turbo-dev \
        freetype-dev \
    && docker-php-ext-configure gd --with-jpeg --with-freetype \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_mysql \
        mysqli \
        intl \
        zip \
        mbstring \
        bcmath \
        opcache \
        gd \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del .build-deps \
    && rm -rf /var/cache/apk/*

# Secure-by-default PHP configuration (SECURITY:SECURE_CONFIGURATION):
# no display_errors in a runtime image, opcache enabled for performance,
# expose_php off so the platform does not advertise its own stack.
COPY docker/php/php.ini /usr/local/etc/php/conf.d/99-nexgen.ini
COPY docker/php/opcache.ini /usr/local/etc/php/conf.d/98-opcache.ini
COPY docker/supervisor/supervisord.conf /etc/supervisor/supervisord.conf

WORKDIR /var/www/html

# Non-root runtime user — the platform must never run its own application
# code as root, regardless of what convenience that would offer.
RUN addgroup -g 1000 nexgen && adduser -G nexgen -u 1000 -D nexgen \
    && chown -R nexgen:nexgen /var/www/html

COPY --chown=nexgen:nexgen . .
COPY --from=vendor --chown=nexgen:nexgen /app/vendor ./vendor

# The image must not depend on executable-bit preservation by a ZIP export,
# source checkout, or Docker build context. ENTRYPOINT is executed directly
# by the kernel, so make the permission part of the immutable image contract.
RUN chmod 0755 /var/www/html/docker/entrypoint.sh
RUN php artisan package:discover --ansi || true

USER nexgen

EXPOSE 9000

ENTRYPOINT ["docker/entrypoint.sh"]
CMD ["php-fpm"]
