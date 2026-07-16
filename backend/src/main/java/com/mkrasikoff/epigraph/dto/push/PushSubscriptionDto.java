package com.mkrasikoff.epigraph.dto.push;

import lombok.Data;

@Data
public class PushSubscriptionDto {

    private String endpoint;
    private Keys keys;
    private int intervalHours;

    @Data
    public static class Keys {
        private String p256dh;
        private String auth;
    }
}
