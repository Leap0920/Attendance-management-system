package com.attendease;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class AttendeaseApplication {

    public static void main(String[] args) {
        SpringApplication.run(AttendeaseApplication.class, args);
    }
}
