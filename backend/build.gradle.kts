plugins {
	java
	id("org.springframework.boot") version "4.0.5"
	id("io.spring.dependency-management") version "1.1.7"
	jacoco
}

tasks.bootJar {
	archiveFileName.set("app.jar")
}

group = "com.mkrasikoff"
version = "1.0.0"
description = "backend"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

repositories {
	mavenCentral()
}

dependencies {
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.springframework.boot:spring-boot-starter-webmvc")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("org.springframework.boot:spring-boot-starter-liquibase")
	implementation("org.springframework.boot:spring-boot-starter-security")
	implementation("org.springframework.boot:spring-boot-starter-oauth2-client")

	implementation("io.jsonwebtoken:jjwt-api:0.12.6")
	implementation("org.bouncycastle:bcprov-jdk18on:1.78.1") // Web Push (VAPID)
	implementation("nl.martijndwars:web-push:5.1.1") { // Web Push (VAPID)
		exclude(group = "org.bouncycastle")
	}
	implementation("tools.jackson.core:jackson-databind:3.1.0")

	developmentOnly("org.springframework.boot:spring-boot-devtools")

	runtimeOnly("org.postgresql:postgresql")
	runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
	runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")
	compileOnly("org.projectlombok:lombok")
	annotationProcessor("org.projectlombok:lombok")

	testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
	testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")

	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
	testCompileOnly("org.projectlombok:lombok")
	testAnnotationProcessor("org.projectlombok:lombok")
}

tasks.withType<Test> {
	useJUnitPlatform()
	finalizedBy(tasks.jacocoTestReport)
}

// JaCoCo: XML-report for CI
tasks.jacocoTestReport {
	dependsOn(tasks.test)
	reports {
		xml.required = true
		html.required = true
	}
}

// JaCoCo: coverage
tasks.jacocoTestCoverageVerification {
	violationRules {
		rule {
			limit {
				minimum = "0.30".toBigDecimal()
			}
		}
	}
}
